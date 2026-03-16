import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronRight, ChevronDown, Download, Upload, Settings, Eye, EyeOff, Info, List, LayoutGrid, SlidersHorizontal, MoreVertical, MoreHorizontal, Plus, Pause, Play, Square, Trash2, AlertTriangle, Clock, Receipt } from "lucide-react";
import { projectsAPI, timeEntriesAPI, customersAPI, usersAPI } from "../../services/api";
import { toast } from "react-toastify";
import NewCustomViewForm from "./NewCustomViewForm";
import NewLogEntryForm from "./NewLogEntryForm";
import BulkUpdateModal, { BulkFieldOption } from "../Expense/shared/BulkUpdateModal";
import ProjectsCustomizeColumnsModal from "./components/ProjectsCustomizeColumnsModal";
import { useCurrency } from "../../hooks/useCurrency";

export default function TimeTrackingProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: rawCurrencyCode } = useCurrency();
  const baseCurrencyCode = rawCurrencyCode ? rawCurrencyCode.split(' ')[0].substring(0, 3).toUpperCase() : "KES";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewForm, setShowCustomViewForm] = useState(false);
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [selectedProjectForLog, setSelectedProjectForLog] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [preferencesSubmenuOpen, setPreferencesSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('name'); // 'name', 'customer', 'created', 'status'
  const [sortDirection, setSortDirection] = useState('asc');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showExportProjectsModal, setShowExportProjectsModal] = useState(false);
  const [exportCurrentViewData, setExportCurrentViewData] = useState({
    decimalFormat: "1234567.89",
    fileFormat: "CSV",
    password: "",
    showPassword: false
  });
  const [exportProjectsData, setExportProjectsData] = useState({
    module: "Projects",
    exportTemplate: "",
    decimalFormat: "1234567.89",
    fileFormat: "CSV",
    includePII: false,
    password: "",
    showPassword: false
  });
  const sortSubmenuRef = useRef(null);
  const importSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const preferencesSubmenuRef = useRef(null);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerNotes, setTimerNotes] = useState("");
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState("");
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProjectFields, setShowProjectFields] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [showProjectsColumnsMenu, setShowProjectsColumnsMenu] = useState(false);
  const [projectsColumnsMenuPos, setProjectsColumnsMenuPos] = useState({ top: 0, left: 0 });
  const [showProjectsCustomizeModal, setShowProjectsCustomizeModal] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const bodyOverflowRef = useRef<string | null>(null);
  const [isCreatingTaskInline, setIsCreatingTaskInline] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appliedAdvancedSearch, setAppliedAdvancedSearch] = useState<any | null>(null);
  const [searchModalData, setSearchModalData] = useState({
    projectName: "",
    customerName: "",
    billingMethod: "",
    status: "All"
  });
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const newDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const taskDropdownRef = useRef(null);
  const projectsColumnsMenuRef = useRef(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [customerBulkOptions, setCustomerBulkOptions] = useState<any[]>([]);
  const [userBulkOptions, setUserBulkOptions] = useState<any[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Function to refresh projects from database
  const refreshProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await projectsAPI.getAll();
      // Handle response format: { success: true, data: [...] } or direct array
      const data = Array.isArray(response)
        ? response
        : (response?.data || []);

      // Transform database projects to match frontend format
      const transformedProjects = data.map(project => {
        const customerId =
          project?.customer?._id ||
          project?.customer?.id ||
          project?.customerId ||
          project?.customer ||
          "";
        const customerName =
          project?.customer?.name ||
          project?.customerName ||
          (customerId ? customerNameLookup.get(String(customerId)) : "") ||
          "";

        return {
          id: project._id || project.id,
          projectName: project.name || project.projectName,
          projectNumber: project.projectNumber || project.id,
          customerName,
          customerId,
          description: project.description || '',
          startDate: project.startDate || '',
          endDate: project.endDate || '',
          status: project.status || 'planning',
          budget: project.budget || 0,
          currency: project.currency || 'USD',
          billable: project.billable !== undefined ? project.billable : true,
          billingRate: project.billingRate || 0,
          billingMethod: project.billingMethod || 'hourly',
          assignedTo: project.assignedTo || [],
          tags: project.tags || [],
          tasks: project.tasks || [],
          users: project.assignedTo || [],
          ...project // Keep all other fields
        };
      });

      setProjects(transformedProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects: " + (error.message || "Unknown error"));
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load projects from database on mount and when location changes
  useEffect(() => {
    refreshProjects();

    // Listen for custom events (when projects are updated from other components)
    const handleProjectUpdate = () => {
      refreshProjects();
    };
    window.addEventListener('projectUpdated', handleProjectUpdate);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
    };
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const loadBulkUpdateOptions = async () => {
      try {
        const [customersResponse, usersResponse] = await Promise.all([
          customersAPI.getAll({ limit: 1000 }),
          usersAPI.getAll({ limit: 1000 }),
        ]);

        if (!mounted) return;

        const customersData = Array.isArray(customersResponse)
          ? customersResponse
          : (customersResponse?.data || []);
        const usersData = Array.isArray(usersResponse)
          ? usersResponse
          : (usersResponse?.data || []);

        const mappedCustomers = customersData
          .map((customer: any) => {
            const id = String(customer?._id || customer?.id || "").trim();
            const label = String(
              customer?.displayName ||
              customer?.name ||
              customer?.companyName ||
              `${customer?.firstName || ""} ${customer?.lastName || ""}`
            ).trim();
            if (!id || !label) return null;
            return { value: id, label };
          })
          .filter(Boolean);

        const mappedUsers = usersData
          .map((user: any) => {
            const id = String(user?._id || user?.id || "").trim();
            const computedName = String(
              user?.name ||
              `${user?.firstName || ""} ${user?.lastName || ""}`
            ).trim();
            const label = computedName || String(user?.email || "").trim();
            if (!id || !label) return null;
            return { value: id, label };
          })
          .filter(Boolean);

        setCustomerBulkOptions(mappedCustomers);
        setUserBulkOptions(mappedUsers);
      } catch (error) {
        console.error("Error loading bulk update options:", error);
      }
    };

    loadBulkUpdateOptions();

    return () => {
      mounted = false;
    };
  }, []);

  // Get billing method display text
  const getBillingMethodText = (method) => {
    const normalized = String(method || "").toLowerCase();
    const methodMap = {
      'fixed': 'Fixed Cost for Project',
      'project-hours': 'Based on Project Hours',
      'task-hours': 'Based on Task Hours',
      'staff-hours': 'Based on Staff Hours',
      'hourly': 'Hourly Rate',
      'hourly-task': 'Hourly Rate Per Task',
      'milestone': 'Milestone'
    };
    return methodMap[normalized] || method || '--';
  };

  const getProjectRateDisplay = (project) => {
    const method = String(project?.billingMethod || "").toLowerCase();
    const fallback = project?.billingRate ?? project?.rate;
    if (method === "fixed") {
      const fixedValue = project?.totalProjectCost ?? fallback;
      return fixedValue !== undefined && fixedValue !== null && fixedValue !== "" ? fixedValue : "--";
    }
    return fallback !== undefined && fallback !== null && fallback !== "" ? fallback : "--";
  };

  // Helper function to calculate elapsed time from start timestamp
  const calculateElapsedTime = (timerState) => {
    if (!timerState) return 0;

    // If timer is running, calculate from startTime
    if (timerState.isTimerRunning && timerState.startTime) {
      const timeSinceStart = Math.floor((Date.now() - timerState.startTime) / 1000);
      return (timerState.pausedElapsedTime || 0) + timeSinceStart;
    }

    // If timer is paused, return the paused elapsed time
    return timerState.pausedElapsedTime || timerState.elapsedTime || 0;
  };

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      const elapsedFromState = calculateElapsedTime(timerState);

      setElapsedTime(elapsedFromState);
      setIsTimerRunning(Boolean(timerState.isTimerRunning));
      setTimerNotes(timerState.timerNotes || '');
      setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');
      setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
      setIsBillable(timerState.isBillable ?? true);

      if (timerState.isTimerRunning && !timerState.startTime) {
        // If timer was running but startTime is missing, set it
        const pausedElapsed = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
        const updatedTimerState = {
          ...timerState,
          startTime: Date.now(),
          pausedElapsedTime: pausedElapsed,
          elapsedTime: pausedElapsed
        };
        localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    let timerState;

    if (savedTimerState) {
      timerState = JSON.parse(savedTimerState);
    } else {
      timerState = {};
    }

    // Update timer state preserving startTime when running
    const updatedState = {
      ...timerState,
      pausedElapsedTime: isTimerRunning ? (timerState.pausedElapsedTime || 0) : elapsedTime,
      isTimerRunning,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable
    };

    // If timer is running, ensure startTime is set
    if (isTimerRunning && !updatedState.startTime) {
      updatedState.startTime = Date.now();
      updatedState.pausedElapsedTime = elapsedTime;
    }

    // If timer is paused, clear startTime
    if (!isTimerRunning && updatedState.startTime) {
      updatedState.pausedElapsedTime = elapsedTime;
      delete updatedState.startTime;
    }

    localStorage.setItem('timerState', JSON.stringify(updatedState));
  }, [elapsedTime, isTimerRunning, timerNotes, selectedProjectForTimer, selectedTaskForTimer, isBillable]);

  // Listen for storage changes (when timer is updated from other page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'timerState' && e.newValue) {
        const timerState = JSON.parse(e.newValue);
        const calculatedElapsedTime = calculateElapsedTime(timerState);
        setElapsedTime(calculatedElapsedTime);
        setIsTimerRunning(Boolean(timerState.isTimerRunning));
        setTimerNotes(timerState.timerNotes || '');
        setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');
        setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
        setIsBillable(timerState.isBillable ?? true);
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        const calculatedElapsedTime = calculateElapsedTime(timerState);
        setElapsedTime(calculatedElapsedTime);
        setIsTimerRunning(Boolean(timerState.isTimerRunning));
        setTimerNotes(timerState.timerNotes || '');
        setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');
        setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
        setIsBillable(timerState.isBillable ?? true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timerStateUpdated', handleCustomStorage);

    // Poll for changes to update elapsed time (especially when timer is running)
    const pollInterval = setInterval(() => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        if (timerState.isTimerRunning) {
          // Always recalculate elapsed time from startTime if timer is running
          const calculatedElapsedTime = calculateElapsedTime(timerState);
          setElapsedTime(calculatedElapsedTime);
        } else {
          setElapsedTime(timerState.pausedElapsedTime || timerState.elapsedTime || 0);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timerStateUpdated', handleCustomStorage);
      clearInterval(pollInterval);
    };
  }, []);

  // Timer functionality - update display every second
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        // Calculate elapsed time from startTime stored in localStorage
        const savedTimerState = localStorage.getItem('timerState');
        if (savedTimerState) {
          const timerState = JSON.parse(savedTimerState);
          if (timerState.isTimerRunning && timerState.startTime) {
            const calculatedElapsedTime = calculateElapsedTime(timerState);
            setElapsedTime(calculatedElapsedTime);
          }
        }
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format time as HH:MM for display in timer controls
  const formatTimeShort = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeVerbose = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(secs).padStart(2, "0")}s`;
  };

  const handleStartTimer = () => {
    // Get current elapsed time (if resuming from pause)
    const savedTimerState = localStorage.getItem('timerState');
    let pausedElapsed = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      pausedElapsed = timerState.pausedElapsedTime || elapsedTime || 0;
    }
    const isResuming = pausedElapsed > 0;

    // Set start time to now and store paused elapsed time
    const timerState = {
      startTime: Date.now(),
      pausedElapsedTime: pausedElapsed,
      isTimerRunning: true,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));

    setIsTimerRunning(true);
    setElapsedTime(pausedElapsed);
    setShowTimerModal(false);
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
    toast.success(isResuming ? 'The timer has been resumed.' : 'The timer has been started.');
  };

  const handlePauseTimer = () => {
    // Calculate final elapsed time before pausing
    const savedTimerState = localStorage.getItem('timerState');
    let finalElapsedTime = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      if (timerState.isTimerRunning && timerState.startTime) {
        finalElapsedTime = calculateElapsedTime(timerState);
      }
    }

    setIsTimerRunning(false);
    setElapsedTime(finalElapsedTime);

    // Save paused state with elapsed time, clear startTime
    const timerState = {
      pausedElapsedTime: finalElapsedTime,
      elapsedTime: finalElapsedTime,
      isTimerRunning: false,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
    toast.success('The timer has been paused.');
  };

  const handleStopTimer = () => {
    // Calculate final elapsed time before stopping
    const savedTimerState = localStorage.getItem('timerState');
    let finalElapsedTime = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      if (timerState.isTimerRunning && timerState.startTime) {
        finalElapsedTime = calculateElapsedTime(timerState);
      } else {
        finalElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || elapsedTime;
      }
    }

    setIsTimerRunning(false);

    // Save the time entry
    if (finalElapsedTime > 0) {
      const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        projectName: selectedProjectForTimer || '',
        taskName: selectedTaskForTimer || '',
        timeSpent: formatTimeShort(finalElapsedTime),
        billable: isBillable,
        user: '',
        notes: timerNotes,
        createdAt: new Date().toISOString()
      };
      existingEntries.push(newEntry);
      localStorage.setItem('timeEntries', JSON.stringify(existingEntries));

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
      toast.success('Time entry saved successfully.');
    } else {
      toast.success('The timer has been stopped.');
    }
    // Reset timer
    setElapsedTime(0);
    setTimerNotes('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    setTaskSearchTerm('');
    setShowTaskDropdown(false);
    setIsCreatingTaskInline(false);
    setIsBillable(true);
    setShowProjectFields(false);
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
    toast.success('The timer has been deleted.');
  };

  const handleDeleteTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setTimerNotes('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    setTaskSearchTerm('');
    setShowTaskDropdown(false);
    setIsCreatingTaskInline(false);
    setIsBillable(true);
    setShowProjectFields(false);
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        if (sortSubmenuRef.current && !sortSubmenuRef.current.contains(event.target)) {
          setSortSubmenuOpen(false);
        }
        if (importSubmenuRef.current && !importSubmenuRef.current.contains(event.target)) {
          setImportSubmenuOpen(false);
        }
        if (exportSubmenuRef.current && !exportSubmenuRef.current.contains(event.target)) {
          setExportSubmenuOpen(false);
        }
        if (preferencesSubmenuRef.current && !preferencesSubmenuRef.current.contains(event.target)) {
          setPreferencesSubmenuOpen(false);
        }
        if (!sortSubmenuRef.current?.contains(event.target) &&
          !importSubmenuRef.current?.contains(event.target) &&
          !exportSubmenuRef.current?.contains(event.target) &&
          !preferencesSubmenuRef.current?.contains(event.target)) {
          setShowMoreMenu(false);
        }
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target)) {
        setShowTaskDropdown(false);
      }
      if (projectsColumnsMenuRef.current && !projectsColumnsMenuRef.current.contains(event.target)) {
        setShowProjectsColumnsMenu(false);
      }
    };

    if (isDropdownOpen || showMoreMenu || showNewDropdown || showProjectDropdown || showTaskDropdown || showProjectsColumnsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, showMoreMenu, showNewDropdown, showProjectDropdown, showTaskDropdown, showProjectsColumnsMenu]);

  useEffect(() => {
    if (showProjectsColumnsMenu) {
      if (bodyOverflowRef.current === null) {
        bodyOverflowRef.current = document.body.style.overflow || "";
      }
      document.body.style.overflow = "hidden";
    } else if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
  }, [showProjectsColumnsMenu]);

  const timerTaskOptions = useMemo(() => {
    const selectedProject = projects.find(
      (project) => project.projectName === selectedProjectForTimer
    );
    const tasks = selectedProject?.tasks || [];
    return tasks
      .map((task: any) => task?.taskName || task?.name || task?.title || "")
      .filter((name: string) => Boolean(name));
  }, [projects, selectedProjectForTimer]);

  const views = [
    { id: "All", label: "All" },
    { id: "Inactive", label: "Inactive" },
    { id: "Active", label: "Active" }
  ];

  const projectColumnOptions = [
    { key: "customerName", label: "Customer Name" },
    { key: "projectName", label: "Project Name", locked: true },
    { key: "billingMethod", label: "Billing Method" },
    { key: "rate", label: "Rate" },
    { key: "status", label: "Project Status" },
  ];

  const [selectedProjectColumns, setSelectedProjectColumns] = useState(
    projectColumnOptions.map((col) => col.key)
  );

  const handleViewSelect = (viewId) => {
    setSelectedView(viewId);
    setIsDropdownOpen(false);
  };

  // Field options for bulk update modal.
  const projectFieldOptions = useMemo<BulkFieldOption[]>(() => ([
    {
      value: "customer",
      label: "Customer Name",
      type: "select",
      options: customerBulkOptions,
    },
    {
      value: "name",
      label: "Project Name",
      type: "text",
      placeholder: "Enter project name",
    },
    {
      value: "billingMethod",
      label: "Billing Method",
      type: "select",
      options: [
        { value: "fixed", label: "Fixed Cost for Project" },
        { value: "project-hours", label: "Based on Project Hours" },
        { value: "task-hours", label: "Based on Task Hours" },
        { value: "staff-hours", label: "Based on Staff Hours" },
        { value: "hourly", label: "Hourly Rate" },
        { value: "hourly-task", label: "Hourly Rate Per Task" },
        { value: "milestone", label: "Milestone" },
      ],
    },
    {
      value: "billingRate",
      label: "Rate",
      type: "number",
      min: 0,
      step: "0.01",
      placeholder: "0.00",
    },
    {
      value: "startDate",
      label: "Start Date",
      type: "date",
    },
    {
      value: "endDate",
      label: "End Date",
      type: "date",
    },
    {
      value: "assignedTo",
      label: "User",
      type: "select",
      options: userBulkOptions,
    },
    {
      value: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "planning", label: "Planning" },
        { value: "active", label: "Active" },
        { value: "on_hold", label: "On Hold" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ]), [customerBulkOptions, userBulkOptions]);

  const customerNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    customerBulkOptions.forEach((opt: any) => {
      if (!opt) return;
      const id = String((opt as any).value || "").trim();
      const label = String((opt as any).label || "").trim();
      if (id) map.set(id, label);
    });
    return map;
  }, [customerBulkOptions]);

  const isValidSelection = (value: string) => String(value || "").trim().length > 0;

  // Handle bulk update
  const handleBulkUpdate = async (field, value, selectedOption) => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project to update.");
      return;
    }

    if (isBulkActionLoading) return;

    const selectedIds = selectedProjects.map((id) => String(id));
    const fieldLabel = projectFieldOptions.find(opt => opt.value === field)?.label || field;

    let normalizedValue: any = value;

    if (selectedOption?.type === "number") {
      const parsedValue = Number(value);
      if (Number.isNaN(parsedValue)) {
        alert("Please enter a valid number.");
        return;
      }
      normalizedValue = parsedValue;
    }

    if ((field === "customer" || field === "assignedTo") && normalizedValue && !isValidSelection(normalizedValue)) {
      alert("Please select a valid value from the dropdown.");
      return;
    }

    const updateData: any = {};
    if (field === "assignedTo") {
      updateData.assignedTo = normalizedValue ? [normalizedValue] : [];
    } else if (field === "customer") {
      updateData.customer = normalizedValue;
      updateData.customerId = normalizedValue;
    } else {
      updateData[field] = normalizedValue;
    }

    const selectedChoice = Array.isArray(selectedOption?.options)
      ? selectedOption.options.find((choice: any) => {
        if (typeof choice === "object") return String(choice.value) === String(normalizedValue);
        return String(choice) === String(normalizedValue);
      })
      : null;
    let displayValue = selectedChoice
      ? (typeof selectedChoice === "object" ? selectedChoice.label : selectedChoice)
      : normalizedValue;
    if (field === "customer") {
      const lookedUpName = customerNameLookup.get(String(normalizedValue || ""));
      if (lookedUpName) {
        displayValue = lookedUpName;
      }
      if (displayValue) {
        updateData.customerName = String(displayValue);
      }
    }

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.update(id, updateData))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were updated.");
      }

      const successText = `Successfully updated ${succeededCount} project${succeededCount > 1 ? "s" : ""} - ${fieldLabel} set to "${displayValue}".`;
      setSuccessMessage(successText);
      toast.success(successText);
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be updated.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
    } catch (error: any) {
      console.error("Error bulk updating projects:", error);
      toast.error(error?.message || "Failed to update selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (statusValue: string, successText: string) => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project.");
      return;
    }

    if (isBulkActionLoading) return;

    const selectedIds = selectedProjects.map((id) => String(id));

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.update(id, { status: statusValue }))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were updated.");
      }

      const successTextValue = `The selected Project${succeededCount > 1 ? "s have" : " has"} been marked as ${successText}.`;
      setSuccessMessage(successTextValue);
      toast.success(successTextValue);
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be updated.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
    } catch (error: any) {
      console.error("Error updating project status:", error);
      toast.error(error?.message || "Failed to update selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (isBulkActionLoading) return;
    if (selectedProjects.length === 0) {
      toast.error("Please select at least one project to delete.");
      setShowDeleteModal(false);
      return;
    }

    const selectedIds = selectedProjects.map((id) => String(id));

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.delete(id))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were deleted.");
      }

      const successText = `Successfully deleted ${succeededCount} project${succeededCount > 1 ? "s" : ""}.`;
      setSuccessMessage(successText);
      toast.success(successText);
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be deleted.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error("Error deleting selected projects:", error);
      toast.error(error?.message || "Failed to delete selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project to delete.");
      return;
    }

    setShowDeleteModal(true);
  };

  const handleBulkCreateInvoice = () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select at least one project.");
      return;
    }

    const selectedRows = projects.filter((row) => selectedProjects.includes(row.id));
    if (selectedRows.length === 0) {
      toast.error("Selected projects could not be found.");
      return;
    }

    const customerIds = Array.from(
      new Set(
        selectedRows
          .map((row) =>
            String(
              row?.customerId ||
              row?.customer?._id ||
              row?.customer?.id ||
              row?.customer ||
              ""
            ).trim()
          )
          .filter(Boolean)
      )
    );

    if (customerIds.length > 1) {
      toast.error("Please select projects for the same customer to create a single invoice.");
      return;
    }

    const customerId = customerIds[0] || "";
    const customerName =
      selectedRows.find((row) => String(row?.customerId || "") === customerId)?.customerName ||
      selectedRows[0]?.customerName ||
      "";

    const payloadProjects = selectedRows.map((row) => ({
      id: row.id,
      projectName: row.projectName,
      billingMethod: row.billingMethod,
      billingRate: row.billingRate,
      totalProjectCost: row.totalProjectCost,
      customerId: row.customerId || customerId,
      customerName: row.customerName || customerName,
      currency: row.currency,
    }));

    navigate("/sales/invoices/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projects: payloadProjects,
      },
    });
    toast.info("Invoice draft created from selected project(s). Review before saving.");
  };

  // Sort options for projects
  const sortOptions = ['Project Name', 'Customer Name', 'Created Time', 'Status'];

  // Sorting function
  const getSortedProjects = (projectsList) => {
    const sorted = [...projectsList];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case 'name':
          aValue = (a.projectName || "").toLowerCase();
          bValue = (b.projectName || "").toLowerCase();
          break;
        case 'customer':
          aValue = (a.customerName || "").toLowerCase();
          bValue = (b.customerName || "").toLowerCase();
          break;
        case 'created':
          aValue = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bValue = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case 'status':
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  // Get filtered and sorted projects (memoized)
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const normalizedStatus = String(project.status || "").toLowerCase();

      // Filter by view
      if (selectedView === 'Active' && normalizedStatus !== 'active') return false;
      if (selectedView === 'Inactive' && normalizedStatus === 'active') return false;

      // Filter by search term
      if (searchTerm) {
        const projectName = String(project.projectName || "").toLowerCase();
        const customerName = String(project.customerName || "").toLowerCase();
        const query = searchTerm.toLowerCase();
        return projectName.includes(query) || customerName.includes(query);
      }
      return true;
    });

    if (appliedAdvancedSearch) {
      filtered = filtered.filter((project) => {
        const projectName = (project.projectName || "").toLowerCase();
        const customerName = (project.customerName || "").toLowerCase();
        const billingMethod = String(project.billingMethod || "").toLowerCase();
        const status = String(project.status || "").toLowerCase();

        if (appliedAdvancedSearch.projectName && !projectName.includes(appliedAdvancedSearch.projectName.toLowerCase())) return false;
        if (appliedAdvancedSearch.customerName && !customerName.includes(appliedAdvancedSearch.customerName.toLowerCase())) return false;
        if (appliedAdvancedSearch.billingMethod && !billingMethod.includes(appliedAdvancedSearch.billingMethod.toLowerCase())) return false;
        if (appliedAdvancedSearch.status && appliedAdvancedSearch.status !== "All") {
          const normalizedFilterStatus = String(appliedAdvancedSearch.status).toLowerCase();
          if (normalizedFilterStatus === "active" && status !== "active") return false;
          if (normalizedFilterStatus === "inactive" && status === "active") return false;
          if (normalizedFilterStatus !== "active" && normalizedFilterStatus !== "inactive" && status !== normalizedFilterStatus) return false;
        }
        return true;
      });
    }

    return getSortedProjects(filtered);
  }, [projects, selectedView, searchTerm, selectedSort, sortDirection, appliedAdvancedSearch]);

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    const sortMap = {
      'Project Name': 'name',
      'Customer Name': 'customer',
      'Created Time': 'created',
      'Status': 'status'
    };
    const sortKey = sortMap[sortOption] || 'name';

    if (selectedSort === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedSort(sortKey);
      setSortDirection('asc');
    }
    setSortSubmenuOpen(false);
  };

  // Helper function to format billing type
  const formatBillingType = (billingMethod) => {
    const methodMap = {
      'fixed': 'Fixed Price',
      'hourly': 'Hourly Rate',
      'hourly-task': 'Task Based Hourly Billing',
      'milestone': 'Milestone Based'
    };
    return methodMap[billingMethod] || billingMethod || '--';
  };

  // Helper function to format budget type
  const formatBudgetType = (hoursBudgetType) => {
    if (!hoursBudgetType || hoursBudgetType === '') return 'No Budget';
    const typeMap = {
      'total-project-hours': 'Total Project Hours',
      'hours-per-task': 'Hours Per Task',
      'hours-per-staff': 'Hours Per Staff'
    };
    return typeMap[hoursBudgetType] || hoursBudgetType;
  };

  const getLoggedHoursDisplay = (project) => {
    const raw =
      project?.loggedHours ??
      project?.loggedTime ??
      project?.totalLoggedHours ??
      project?.totalHours ??
      project?.loggedMinutes ??
      project?.totalMinutes ??
      project?.hoursLogged ??
      project?.timeLogged;

    if (typeof raw === "string" && raw.includes(":")) return raw;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      if (raw > 0 && raw <= 24 && String(raw).includes(".")) {
        const totalMinutes = Math.round(raw * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      if (raw > 0 && raw < 1000) {
        const h = Math.floor(raw);
        const m = Math.round((raw - h) * 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
    if (typeof raw === "string" && raw.trim()) return raw;
    return "00:00";
  };

  // Export tasks function
  const exportTasks = (format, projectsToExport) => {
    // Collect all tasks from all projects
    const allTasks = [];
    projectsToExport.forEach((project) => {
      const projectTasks = project.tasks || [];
      projectTasks.forEach((task, taskIndex) => {
        allTasks.push({
          taskId: `${(project._id || project.id || "").toString()}_${taskIndex}`,
          taskName: task.taskName || "",
          description: task.description || "",
          projectName: project.name || project.projectName || "",
          taskRatePerHour: task.rate || task.hourlyRate || task.billingRate || 0,
          taskBudgetHours: task.budgetHours || "00:00",
          isBillable: task.billable !== undefined ? task.billable : true,
          taskStatus: task.status || "Active"
        });
      });
    });

    const exportData = allTasks.slice(0, 25000);

    // Define all columns as per the image
    const headers = [
      "Task ID",
      "Task Name",
      "Description",
      "Project Name",
      "Task Rate Per Hour",
      "Task Budget Hours",
      "Is Billable",
      "Task Status"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((task) => {
        const row = [
          `"${task.taskId.replace(/"/g, '""')}"`,
          `"${task.taskName.replace(/"/g, '""')}"`,
          `"${task.description.replace(/"/g, '""')}"`,
          `"${task.projectName.replace(/"/g, '""')}"`,
          `"${task.taskRatePerHour}"`,
          `"${task.taskBudgetHours}"`,
          `"${task.isBillable ? 'TRUE' : 'FALSE'}"`,
          `"${task.taskStatus.replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `project_tasks_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(task => {
        return `
                    <tr>
                      <td>${task.taskId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.taskName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.taskRatePerHour}</td>
                      <td>${task.taskBudgetHours}</td>
                      <td>${task.isBillable ? 'TRUE' : 'FALSE'}</td>
                      <td>${task.taskStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `project_tasks_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export timesheets function
  const exportTimesheets = async (format) => {
    try {
      // Fetch all time entries from the database
      const response = await timeEntriesAPI.getAll();
      const data = Array.isArray(response)
        ? response
        : (response?.data || []);

      const exportData = data.slice(0, 25000);

      // Define all columns as per the image
      const headers = [
        "Timesheet ID",
        "Project Name",
        "Task Name",
        "Staff Name",
        "Email",
        "Staff Rate",
        "Notes",
        "Time Spent",
        "Begin time",
        "End time",
        "Date",
        "Project Days",
        "Billable Status",
        "Billed Status"
      ];

      // Helper function to format time from hours and minutes
      const formatTimeSpent = (hours, minutes) => {
        const h = hours || 0;
        const m = minutes || 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      // Helper function to format date
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (e) {
          return dateStr;
        }
      };

      if (format === "csv") {
        let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

        exportData.forEach((entry) => {
          const timesheetId = (entry._id || entry.id || "").toString();
          const projectName = entry.project?.name || entry.projectName || "";
          const taskName = entry.task || entry.taskName || "";
          const staffName = entry.user?.name || entry.userName || "";
          const email = entry.user?.email || entry.userEmail || "";
          const staffRate = entry.billingRate || entry.rate || "";
          const notes = entry.description || entry.notes || "";
          const timeSpent = formatTimeSpent(entry.hours, entry.minutes);
          const beginTime = entry.startTime || entry.beginTime || "";
          const endTime = entry.endTime || "";
          const date = formatDate(entry.date);
          const projectDays = 0; // Default value
          const billableStatus = entry.billable ? "Billable" : "Non-Billable";
          const billedStatus = entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed"
            ? "Billed"
            : "Unbilled";

          const row = [
            `"${timesheetId.replace(/"/g, '""')}"`,
            `"${projectName.replace(/"/g, '""')}"`,
            `"${taskName.replace(/"/g, '""')}"`,
            `"${staffName.replace(/"/g, '""')}"`,
            `"${email.replace(/"/g, '""')}"`,
            `"${staffRate}"`,
            `"${notes.replace(/"/g, '""')}"`,
            `"${timeSpent}"`,
            `"${beginTime}"`,
            `"${endTime}"`,
            `"${date}"`,
            `"${projectDays}"`,
            `"${billableStatus.replace(/"/g, '""')}"`,
            `"${billedStatus.replace(/"/g, '""')}"`
          ];
          csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `timesheets_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For XLS/XLSX, create HTML table format that Excel can open
        let htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8">
              <style>
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
                td { padding: 8px; border: 1px solid #d1d5db; }
              </style>
            </head>
            <body>
              <table>
                <thead>
                  <tr>
                    ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${exportData.map(entry => {
          const timesheetId = (entry._id || entry.id || "").toString();
          const projectName = entry.project?.name || entry.projectName || "";
          const taskName = entry.task || entry.taskName || "";
          const staffName = entry.user?.name || entry.userName || "";
          const email = entry.user?.email || entry.userEmail || "";
          const staffRate = entry.billingRate || entry.rate || "";
          const notes = entry.description || entry.notes || "";
          const timeSpent = formatTimeSpent(entry.hours, entry.minutes);
          const beginTime = entry.startTime || entry.beginTime || "";
          const endTime = entry.endTime || "";
          const date = formatDate(entry.date);
          const projectDays = 0;
          const billableStatus = entry.billable ? "Billable" : "Non-Billable";
          const billedStatus = entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed"
            ? "Billed"
            : "Unbilled";

          return `
                      <tr>
                        <td>${timesheetId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${taskName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${staffName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${email.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${staffRate}</td>
                        <td>${notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${timeSpent}</td>
                        <td>${beginTime}</td>
                        <td>${endTime}</td>
                        <td>${date}</td>
                        <td>${projectDays}</td>
                        <td>${billableStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${billedStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      </tr>
                    `;
        }).join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;

        // Determine MIME type and file extension
        const mimeType = format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.ms-excel";
        const fileExtension = format === "xlsx" ? "xlsx" : "xls";

        const blob = new Blob([htmlContent], { type: mimeType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `timesheets_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting timesheets:", error);
      toast.error("Failed to export timesheets: " + (error.message || "Unknown error"));
    }
  };

  // Export current view function (simplified columns)
  const exportCurrentView = (format, projectsToExport) => {
    const exportData = projectsToExport.slice(0, 10000); // Limit to 10,000 as per modal note

    // Define simplified columns as per the image
    const headers = [
      "PROJECT_ID",
      "Customer Name",
      "Project Name",
      "Billing Method",
      "Rate"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((project) => {
        const projectId = (project._id || project.id || "").toString();
        const customerName = project.customer?.name || project.customerName || "";
        const projectName = project.name || project.projectName || "";
        const billingMethod = formatBillingType(project.billingMethod);
        const rate = project.billingRate || "";

        const row = [
          `"${projectId.replace(/"/g, '""')}"`,
          `"${customerName.replace(/"/g, '""')}"`,
          `"${projectName.replace(/"/g, '""')}"`,
          `"${billingMethod.replace(/"/g, '""')}"`,
          `"${rate}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `current_view_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(project => {
        const projectId = (project._id || project.id || "").toString();
        const customerName = project.customer?.name || project.customerName || "";
        const projectName = project.name || project.projectName || "";
        const billingMethod = formatBillingType(project.billingMethod);
        const rate = project.billingRate || "";

        return `
                    <tr>
                      <td>${projectId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${customerName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingMethod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${rate}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `current_view_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export function
  const exportProjects = (format, projectsToExport) => {
    const exportData = projectsToExport.slice(0, 25000);

    // Define all columns as per the image
    const headers = [
      "Project ID",
      "Project Name",
      "Project Code",
      "Description",
      "Billing Type",
      "Project Cost",
      "Customer Name",
      "Currency Code",
      "Budget Type",
      "Budget Amount",
      "Cost Budget",
      "Project Budget Hours",
      "Project Status",
      "Billing Rate Frequency",
      "Hours Per Day"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((project) => {
        const projectId = (project._id || project.id || "").toString();
        const projectName = project.name || project.projectName || "";
        const projectCode = project.projectNumber || project.id || "";
        const description = project.description || "";
        const billingType = formatBillingType(project.billingMethod);
        const projectCost = project.budget || 0;
        const customerName = project.customer?.name || project.customerName || "";
        const currencyCode = project.currency || "USD";
        const budgetType = formatBudgetType(project.hoursBudgetType);
        const budgetAmount = project.budget || 0;
        const costBudget = project.budget || 0;
        const projectBudgetHours = project.totalBudgetHours || "0";
        const projectStatus = project.status || "Active";
        const billingRateFrequency = project.billingMethod === 'hourly' ? 'hourly' : (project.billingMethod || 'hourly');
        const hoursPerDay = "00:00"; // Default value

        const row = [
          `"${projectId.replace(/"/g, '""')}"`,
          `"${projectName.replace(/"/g, '""')}"`,
          `"${projectCode.toString().replace(/"/g, '""')}"`,
          `"${description.replace(/"/g, '""')}"`,
          `"${billingType.replace(/"/g, '""')}"`,
          `"${projectCost}"`,
          `"${customerName.replace(/"/g, '""')}"`,
          `"${currencyCode.replace(/"/g, '""')}"`,
          `"${budgetType.replace(/"/g, '""')}"`,
          `"${budgetAmount}"`,
          `"${costBudget}"`,
          `"${projectBudgetHours}"`,
          `"${projectStatus.replace(/"/g, '""')}"`,
          `"${billingRateFrequency.replace(/"/g, '""')}"`,
          `"${hoursPerDay}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `projects_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(project => {
        const projectId = (project._id || project.id || "").toString();
        const projectName = project.name || project.projectName || "";
        const projectCode = project.projectNumber || project.id || "";
        const description = project.description || "";
        const billingType = formatBillingType(project.billingMethod);
        const projectCost = project.budget || 0;
        const customerName = project.customer?.name || project.customerName || "";
        const currencyCode = project.currency || "USD";
        const budgetType = formatBudgetType(project.hoursBudgetType);
        const budgetAmount = project.budget || 0;
        const costBudget = project.budget || 0;
        const projectBudgetHours = project.totalBudgetHours || "0";
        const projectStatus = project.status || "Active";
        const billingRateFrequency = project.billingMethod === 'hourly' ? 'hourly' : (project.billingMethod || 'hourly');
        const hoursPerDay = "00:00";

        return `
                    <tr>
                      <td>${projectId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectCode.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingType.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectCost}</td>
                      <td>${customerName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${currencyCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${budgetType.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${budgetAmount}</td>
                      <td>${costBudget}</td>
                      <td>${projectBudgetHours}</td>
                      <td>${projectStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingRateFrequency.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${hoursPerDay}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `projects_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
  return (
    <div className="flex flex-col w-full relative h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      {selectedProjects.length === 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-30 shadow-sm">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 border-none bg-transparent p-0 text-[32px] font-semibold text-gray-800"
            >
              All Projects
              <ChevronDown size={14} className="text-[#156372]" />
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                {views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => handleViewSelect(view.id)}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center justify-between rounded border px-3 py-2 text-left text-sm ${selectedView === view.id ? "border-[#156372] bg-[#156372]/10 text-gray-800" : "border-transparent text-gray-700 hover:bg-gray-50"}`}
                  >
                    {view.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setShowCustomViewForm(true);
                  }}
                  className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center gap-2 border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372]"
                >
                  <Plus size={14} />
                  New Custom View
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center justify-center border-none px-3 py-1.5 ${viewMode === 'list' ? 'bg-white text-gray-800' : 'bg-transparent text-gray-500'}`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center justify-center border-none px-3 py-1.5 ${viewMode === 'grid' ? 'bg-white text-gray-800' : 'bg-transparent text-gray-500'}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {!(isTimerRunning || elapsedTime > 0) && (
              <button
                onClick={() => setShowTimerModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#374151" strokeWidth="1.5" />
                  <path d="M8 5v3l2 2" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Start
              </button>
            )}

            {(isTimerRunning || elapsedTime > 0) && (
              <div className="flex items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                <div className="flex h-9 items-center gap-1.5 border-r border-gray-200 px-3 text-xs font-medium text-gray-800">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="7" stroke="#6b7280" strokeWidth="1.5" />
                    <path d="M8 5v3l2 2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {formatTime(elapsedTime)}
                </div>
                <button
                  onClick={isTimerRunning ? handlePauseTimer : handleStartTimer}
                  className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-[#2563eb] hover:bg-gray-50"
                  title={isTimerRunning ? "Pause timer" : "Resume timer"}
                >
                  {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  onClick={handleStopTimer}
                  className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-red-500 hover:bg-gray-50"
                  title="Stop timer"
                >
                  <Square size={12} />
                </button>
                <button
                  onClick={handleDeleteTimer}
                  className="flex h-9 w-8 items-center justify-center border-none bg-white text-gray-500 hover:bg-gray-50"
                  title="Delete timer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            <div ref={newDropdownRef} className="relative flex items-center">
              <button
                onClick={() => navigate('/time-tracking/projects/new')}
                className="flex h-9 items-center gap-1.5 rounded-l-md border-none bg-[#408dfb] px-3.5 text-sm font-semibold text-white hover:bg-[#307deb] cursor-pointer"
              >
                <Plus size={15} />
                New
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewDropdown(!showNewDropdown);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-r-md border-none border-l border-white/20 bg-[#408dfb] text-white hover:bg-[#307deb] cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
              {showNewDropdown && (
                <div className="absolute right-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                  <button
                    onClick={() => { navigate('/time-tracking/timesheet/weekly'); setShowNewDropdown(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Plus size={14} />
                    New Weekly Time Log
                  </button>
                </div>
              )}
            </div>

            <div ref={moreMenuRef} className="relative">
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-[#f4f4f4] p-0 text-gray-700 hover:bg-gray-200 cursor-pointer ml-1"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                  <button
                    onClick={() => { setShowExportProjectsModal(true); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Download size={14} />
                    Export Projects
                  </button>
                  <button
                    onClick={() => { navigate('/time-tracking/projects/import'); setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Upload size={14} />
                    Import Projects
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProjects.length > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkUpdateModal(true)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Bulk Update
            </button>
            <button
              onClick={handleBulkCreateInvoice}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Create Invoice
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("active", "Active")}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Mark as Active
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("inactive", "Inactive")}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Mark as Inactive
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("completed", "Completed")}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Mark as Completed
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-[#156372] px-2 py-0.5 text-xs font-semibold text-white">{selectedProjects.length}</span>
            <span className="text-sm text-gray-700">Selected</span>
            <span className="text-xs text-gray-400">Esc</span>
            <button
              onClick={() => setSelectedProjects([])}
              className="text-red-500 hover:text-red-600"
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden bg-white flex flex-col">
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-auto border-t border-gray-200 bg-white">
            <table className="w-full border-collapse bg-white">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-[60px] px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 projects-select-header">
                    <div className="flex items-center gap-2 projects-select-header-actions" ref={projectsColumnsMenuRef}>
                      <button
                        type="button"
                        className="border-none bg-transparent p-0 text-[#156372]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProjectsColumnsMenu(false);
                          setShowProjectsCustomizeModal(true);
                        }}
                        aria-label="Customize Columns"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </div>
                    <div className="projects-select-header-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedProjects(filteredAndSortedProjects.map((p) => p.id));
                          else setSelectedProjects([]);
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">CUSTOMER NAME</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">PROJECT NAME</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">BILLING METHOD</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">RATE</th>
                  <th className="w-[40px] px-4 py-3 text-right">
                    <button onClick={() => setIsSearchModalOpen(true)} className="border-none bg-transparent p-0 text-gray-500">
                      <Search size={16} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProjects.map((project) => (
                  <tr key={project.id} className="cursor-pointer border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 projects-select-cell">
                      <div className="projects-select-cell-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedProjects([...selectedProjects, project.id]);
                            else setSelectedProjects(selectedProjects.filter((id) => id !== project.id));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800" onClick={() => navigate(`/time-tracking/projects/${project.id}`)}>{project.customerName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-[#156372]" onClick={() => navigate(`/time-tracking/projects/${project.id}`)}>{project.projectName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800" onClick={() => navigate(`/time-tracking/projects/${project.id}`)}>{getBillingMethodText(project.billingMethod)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800" onClick={() => navigate(`/time-tracking/projects/${project.id}`)}>{getProjectRateDisplay(project)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      No projects found. Click "+ New" to create your first project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-5 p-6">
            {filteredAndSortedProjects.map((project) => (
              <div
                key={project.id}
                className="w-[260px] cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-6 shadow-sm transition-shadow hover:shadow"
                onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="text-[26px] font-semibold text-[#2563eb]">
                    {project.projectName || "--"}
                  </div>
                  <div className="mt-2 text-sm text-[#2563eb]">
                    {project.customerName || "--"}
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="text-[18px] font-medium text-gray-900">Logged Hours</div>
                  <div className="mt-1 text-sm text-gray-700">{getLoggedHoursDisplay(project)}</div>
                </div>

                <div className="my-5 border-t border-gray-200" />

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectForTimer(project.projectName || project.name || "");
                      setShowProjectFields(true);
                      setShowTimerModal(true);
                    }}
                    className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 transition-colors hover:bg-[#e5e7eb]"
                  >
                    Log Time
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
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
                      navigate("/purchases/expenses/new", {
                        state: {
                          source: "timeTrackingProjects",
                          projectId: project.id,
                          projectName: project.projectName || project.name || "Project",
                          customerId,
                          customerName,
                          currency: project.currency || baseCurrencyCode,
                        },
                      });
                    }}
                    className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 transition-colors hover:bg-[#e5e7eb]"
                  >
                    Create Expense
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timer Modal - START TIMER */}
      {showTimerModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTimerModal(false);
            }
          }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 p-5"
        >
          <div className="w-full max-w-[450px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="relative border-b border-gray-200 px-5 py-3">
              <div className="flex flex-col items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8.5" stroke="#6b7280" strokeWidth="1.5" />
                  <path d="M10 6v4l3 2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <h2 className="m-0 text-sm font-medium tracking-wide text-gray-700">START TIMER</h2>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded bg-transparent p-0 text-gray-800 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mb-5 text-center">
                <div className="text-[40px] font-semibold leading-none tracking-wide text-gray-800">
                  {formatTimeVerbose(elapsedTime)}
                </div>
              </div>

              {!showProjectFields && (
                <div className="mb-5">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowProjectFields(true);
                    }}
                    className="flex items-center gap-2 text-sm text-[#156372] no-underline hover:no-underline"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 2l4 4-4 4M4 8h8" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Associate Project
                  </a>
                </div>
              )}

              {showProjectFields && (
                <div className="mb-5 space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Project Name<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedProjectForTimer}
                      onChange={(e) => {
                        setSelectedProjectForTimer(e.target.value);
                        setSelectedTaskForTimer("");
                        setTaskSearchTerm("");
                        setShowTaskDropdown(false);
                        setIsCreatingTaskInline(false);
                      }}
                      className="w-full rounded-md border border-gray-300 py-2.5 pl-3 pr-9 text-sm outline-none focus:border-[#156372]"
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.projectName}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Task Name<span className="text-red-500">*</span>
                      </label>
                      {isCreatingTaskInline && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingTaskInline(false);
                            setShowTaskDropdown(false);
                          }}
                          className="border-none bg-transparent p-0 text-sm text-[#2563eb]"
                        >
                          Select from list
                        </button>
                      )}
                    </div>

                    {isCreatingTaskInline ? (
                      <div className="w-[70%] bg-gray-50 p-2">
                        <input
                          type="text"
                          value={selectedTaskForTimer}
                          onChange={(e) => setSelectedTaskForTimer(e.target.value)}
                          placeholder="Enter task name"
                          className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-3 pr-3 text-sm outline-none focus:border-[#156372]"
                        />
                      </div>
                    ) : (
                      <div className="relative" ref={taskDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowTaskDropdown((prev) => !prev)}
                          className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white py-2.5 pl-3 pr-3 text-sm text-left outline-none focus:border-[#156372]"
                        >
                          <span className={selectedTaskForTimer ? "text-gray-800" : "text-gray-400"}>
                            {selectedTaskForTimer || "Select task"}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-gray-500 transition-transform ${showTaskDropdown ? "rotate-180" : ""}`}
                          />
                        </button>

                        {showTaskDropdown && (
                          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                            <div className="border-b border-gray-200 p-2">
                              <div className="flex items-center gap-2 rounded-md border border-[#3b82f6] px-2 py-1.5">
                                <Search size={14} className="text-gray-400" />
                                <input
                                  type="text"
                                  value={taskSearchTerm}
                                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                                  placeholder="Search"
                                  className="w-full border-none bg-transparent p-0 text-sm outline-none"
                                />
                              </div>
                            </div>

                            <div className="max-h-36 overflow-y-auto px-3 py-2 text-sm">
                              {timerTaskOptions
                                .filter((name) => name.toLowerCase().includes(taskSearchTerm.toLowerCase()))
                                .map((taskName, idx) => (
                                  <button
                                    key={`${taskName}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTaskForTimer(taskName);
                                      setShowTaskDropdown(false);
                                    }}
                                    className="block w-full border-none bg-transparent px-0 py-1.5 text-left text-gray-700 hover:text-[#156372]"
                                  >
                                    {taskName}
                                  </button>
                                ))}

                              {timerTaskOptions.filter((name) => name.toLowerCase().includes(taskSearchTerm.toLowerCase())).length === 0 && (
                                <div className="py-1 text-gray-500">NO RESULTS FOUND</div>
                              )}
                            </div>

                            <div className="border-t border-gray-200 px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTaskDropdown(false);
                                  setIsCreatingTaskInline(true);
                                  setSelectedTaskForTimer(taskSearchTerm.trim());
                                  setTaskSearchTerm("");
                                }}
                                className="flex items-center gap-2 border-none bg-transparent p-0 text-sm text-[#2563eb]"
                              >
                                <Plus size={14} />
                                New Task
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isBillable}
                      onChange={(e) => setIsBillable(e.target.checked)}
                    />
                    Billable
                  </label>
                </div>
              )}

              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={timerNotes}
                  onChange={(e) => setTimerNotes(e.target.value)}
                  placeholder="Add notes"
                  rows={2}
                  className="w-full resize-y rounded-md border border-gray-300 p-2.5 text-sm outline-none focus:border-[#156372]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartTimer}
                  className="rounded-md border-none bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Start Timer
                </button>
                <button
                  onClick={() => {
                    setShowTimerModal(false);
                    setTimerNotes('');
                    setSelectedProjectForTimer('');
                    setSelectedTaskForTimer('');
                    setTaskSearchTerm('');
                    setIsBillable(true);
                    setShowProjectFields(false);
                    setShowTaskDropdown(false);
                    setIsCreatingTaskInline(false);
                  }}
                  className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        onUpdate={(field, value, selectedField) => handleBulkUpdate(field, value, selectedField)}
        title="Bulk Update Projects"
        fieldOptions={projectFieldOptions}
        entityName="projects"
      />

      <ProjectsCustomizeColumnsModal
        isOpen={showProjectsCustomizeModal}
        columns={projectColumnOptions}
        selectedKeys={selectedProjectColumns}
        onSave={(nextKeys) => setSelectedProjectColumns(nextKeys)}
        onClose={() => setShowProjectsCustomizeModal(false)}
      />

      {showDeleteModal && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/40 pt-20">
          <div className="w-full max-w-[520px] overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle size={16} />
                </div>
                <div className="text-[15px] font-semibold text-slate-800">Delete project?</div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              You cannot retrieve this project once it has been deleted.
            </div>
            <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
              <button
                className="rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4e59]"
                onClick={handleConfirmBulkDelete}
              >
                Delete
              </button>
              <button
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowPreferencesModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-[500px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Project Preferences
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Default View
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="list">List View</option>
                <option value="card">Card View</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-200">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save preferences logic here
                  setShowPreferencesModal(false);
                }}
                className="px-4 py-2 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchModalOpen(false);
              setSearchModalData({
                projectName: "",
                customerName: "",
                billingMethod: "",
                status: "All"
              });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px] mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 m-0">Search Projects</h2>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchModalData({
                    projectName: "",
                    customerName: "",
                    billingMethod: "",
                    status: "All"
                  });
                }}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Search Form */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                    <input
                      type="text"
                      value={searchModalData.projectName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                    <input
                      type="text"
                      value={searchModalData.customerName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter customer name"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4">
                  {/* Billing Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Method</label>
                    <input
                      type="text"
                      value={searchModalData.billingMethod}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, billingMethod: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter billing method"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      value={searchModalData.status}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setSearchModalData({
                      projectName: "",
                      customerName: "",
                      billingMethod: "",
                      status: "All"
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAppliedAdvancedSearch({ ...searchModalData });
                    if (searchModalData.status && searchModalData.status !== "All") {
                      setSelectedView(searchModalData.status);
                    }
                    setIsSearchModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer hover:bg-[#0D4A52]"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Current View Modal */}
      {showExportCurrentViewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowExportCurrentViewModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-[600px] w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Export Current View
              </h2>
              <button
                onClick={() => setShowExportCurrentViewModal(false)}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Information Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6 flex items-start gap-3">
              <Info size={20} className="text-[#156372] shrink-0 mt-0.5" />
              <p className="m-0 text-sm text-blue-800 leading-normal">
                Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format.
              </p>
            </div>

            {/* Decimal Format */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decimal Format <span className="text-red-500">*</span>
              </label>
              <select
                value={exportCurrentViewData.decimalFormat}
                onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, decimalFormat: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer outline-none focus:border-[#156372]"
              >
                <option value="1234567.89">1234567.89</option>
                <option value="1,234,567.89">1,234,567.89</option>
                <option value="1234567,89">1234567,89</option>
                <option value="1.234.567,89">1.234.567,89</option>
              </select>
            </div>

            {/* Export File Format */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export File Format <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-3">
                <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-md border ${exportCurrentViewData.fileFormat === 'CSV' ? 'border-[#156372] bg-[#156372]/5' : 'border-gray-200 bg-transparent'}`}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="CSV"
                    checked={exportCurrentViewData.fileFormat === 'CSV'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    className="w-4.5 h-4.5 cursor-pointer accent-[#156372]"
                  />
                  <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportCurrentViewData.fileFormat === 'XLS' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportCurrentViewData.fileFormat === 'XLS' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="XLS"
                    checked={exportCurrentViewData.fileFormat === 'XLS'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportCurrentViewData.fileFormat === 'XLSX' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportCurrentViewData.fileFormat === 'XLSX' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="XLSX"
                    checked={exportCurrentViewData.fileFormat === 'XLSX'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLSX (Microsoft Excel)</span>
                </label>
              </div>
            </div>

            {/* File Protection Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                File Protection Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={exportCurrentViewData.showPassword ? 'text' : 'password'}
                  value={exportCurrentViewData.password}
                  onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, password: e.target.value })}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExportCurrentViewData({ ...exportCurrentViewData, showPassword: !exportCurrentViewData.showPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {exportCurrentViewData.showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
              </p>
            </div>

            {/* Note */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6'
              }}>
                <strong>Note:</strong> You can export only the first 10,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{' '}
                <a href="#" style={{ color: '#156372', textDecoration: 'underline' }}>Backup Your Data</a>
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowExportCurrentViewModal(false)}
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
                onMouseEnter={(e) => (e.target as any).style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => (e.target as any).style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportCurrentView(exportCurrentViewData.fileFormat.toLowerCase(), filteredAndSortedProjects);
                  setShowExportCurrentViewModal(false);
                  toast.success('Export started');
                }}
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
                onMouseEnter={(e) => (e.target as any).style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => (e.target as any).style.backgroundColor = '#156372'}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Projects Modal */}
      {showExportProjectsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
          onClick={() => setShowExportProjectsModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Export Projects
              </h2>
              <button
                onClick={() => setShowExportProjectsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Information Banner */}
            <div style={{
              backgroundColor: '#e0f2fe',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Info size={20} color="#156372" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.5'
              }}>
                You can export your data from Zoho Books in CSV, XLS or XLSX format.
              </p>
            </div>

            {/* Module */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Module <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={exportProjectsData.module}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, module: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="Projects">Projects</option>
                <option value="Project Tasks">Project Tasks</option>
                <option value="Timesheet">Timesheet</option>
              </select>
            </div>

            {/* Export Template */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Export Template <Info size={14} color="#6b7280" />
              </label>
              <select
                value={exportProjectsData.exportTemplate}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, exportTemplate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select an Export Template</option>
                <option value="template1">Template 1</option>
                <option value="template2">Template 2</option>
              </select>
            </div>

            {/* Decimal Format */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Decimal Format <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={exportProjectsData.decimalFormat}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, decimalFormat: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="1234567.89">1234567.89</option>
                <option value="1,234,567.89">1,234,567.89</option>
                <option value="1234567,89">1234567,89</option>
                <option value="1.234.567,89">1.234.567,89</option>
              </select>
            </div>

            {/* Export File Format */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Export File Format <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'CSV' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'CSV' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="CSV"
                    checked={exportProjectsData.fileFormat === 'CSV'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>CSV (Comma Separated Value)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'XLS' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'XLS' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="XLS"
                    checked={exportProjectsData.fileFormat === 'XLS'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'XLSX' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'XLSX' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="XLSX"
                    checked={exportProjectsData.fileFormat === 'XLSX'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLSX (Microsoft Excel)</span>
                </label>
              </div>
            </div>

            {/* Include PII Checkbox */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={exportProjectsData.includePII}
                  onChange={(e) => setExportProjectsData({ ...exportProjectsData, includePII: e.target.checked })}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#156372'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Include Sensitive Personally Identifiable Information (PII) while exporting.
                </span>
              </label>
            </div>

            {/* File Protection Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                File Protection Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={exportProjectsData.showPassword ? 'text' : 'password'}
                  value={exportProjectsData.password}
                  onChange={(e) => setExportProjectsData({ ...exportProjectsData, password: e.target.value })}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExportProjectsData({ ...exportProjectsData, showPassword: !exportProjectsData.showPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {exportProjectsData.showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
              </p>
            </div>

            {/* Note */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6'
              }}>
                <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{' '}
                <a href="#" style={{ color: '#156372', textDecoration: 'underline' }}>Backup Your Data</a>
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowExportProjectsModal(false)}
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
                onMouseEnter={(e) => (e.target as any).style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => (e.target as any).style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (exportProjectsData.module === "Project Tasks") {
                    exportTasks(exportProjectsData.fileFormat.toLowerCase(), projects);
                  } else if (exportProjectsData.module === "Timesheet") {
                    await exportTimesheets(exportProjectsData.fileFormat.toLowerCase());
                  } else {
                    exportProjects(exportProjectsData.fileFormat.toLowerCase(), projects);
                  }
                  setShowExportProjectsModal(false);
                  toast.success('Export started');
                }}
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
                onMouseEnter={(e) => (e.target as any).style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => (e.target as any).style.backgroundColor = '#156372'}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




