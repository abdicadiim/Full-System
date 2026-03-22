import React, { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronLeft, ChevronRight, Download, Upload, Settings, RefreshCw, Edit3, Eye, EyeOff, Info, ChevronDown, Play, Pause, Square, Trash2, Plus, MoreVertical, MoreHorizontal, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { projectsAPI, timeEntriesAPI, usersAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import { toast } from "react-toastify";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";
import ProjectsPage from "../home/pages/ProjectsPage";
import NewProjectForm from "./NewProjectForm";
import ProjectDetailPage from "./ProjectDetailPage";
import EditProjectForm from "./EditProjectForm";
import NewLogEntryForm from "./NewLogEntryForm";
import WeeklyTimeLog from "./WeeklyTimeLog";
import StartTimerModal from "./StartTimerModal";
import ImportProjects from "./ImportProjects";
import ImportTimesheets from "./ImportTimesheets";
import ImportProjectTasks from "./ImportProjectTasks";
import TimeTrackingProject from "./TimeTrackingProject";
import Aptouvals from "./aprovals/aptouvals";
import CustomerApproval from "./CustomerApproval/CustomerApproval";
import NewCustomerApproval from "./CustomerApproval/NewCustomerApproval";

const getUserDisplayName = (user) => {
  if (!user || typeof user !== "object") return "";
  const firstName = String(user.firstName || "").trim();
  const lastName = String(user.lastName || "").trim();
  return String(
    user.name ||
    user.fullName ||
    user.username ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    user.email ||
    ""
  ).trim();
};

const getUserDisplayId = (user) => {
  if (!user || typeof user !== "object") return "";
  return String(user._id || user.id || user.userId || "").trim();
};

const isLikelyId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);

const getEntryUserLabel = (entry, userById, currentUser = null) => {
  if (!entry) return "--";

  if (entry.userName && entry.userName !== "--") {
    return entry.userName;
  }

  if (entry.user && typeof entry.user === "object") {
    const objectName = getUserDisplayName(entry.user);
    if (objectName) return objectName;
  }

  const currentUserId = getUserDisplayId(currentUser);
  const currentUserName = getUserDisplayName(currentUser);
  const entryUserId = String(entry.userId || "").trim();
  const rawUser = String(entry.user || "").trim();

  if (currentUserId && entryUserId && entryUserId === currentUserId && currentUserName) {
    return currentUserName;
  }

  for (const candidate of [entryUserId, rawUser].filter(Boolean)) {
    const match = userById?.get?.(String(candidate));
    const matchName = getUserDisplayName(match) || String(match?.name || "").trim();
    if (matchName) return matchName;
  }

  if (currentUserId && rawUser === currentUserId && currentUserName) {
    return currentUserName;
  }

  if (entry.user && !isLikelyId(entry.user) && entry.user !== "--") {
    return entry.user;
  }

  return "--";
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatCalendarKey = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

type TimerState = {
  elapsedTime?: number;
  isTimerRunning?: boolean;
  timerNotes?: string;
  associatedProject?: string;
  selectedProjectForTimer?: string;
  selectedTaskForTimer?: string;
  isBillable?: boolean;
  lastUpdated?: number;
  startTime?: number;
  pausedElapsedTime?: number;
};

const getMonthStart = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getCalendarWeeks = (date) => {
  const monthStart = getMonthStart(date);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const cells = [];
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const cellDate = new Date(monthStart);
    cellDate.setDate(day);
    cells.push(cellDate);
  }

  return cells;
};

const getMonthLabel = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(date));
};

const getLongMonthLabel = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(date));
};



// Time Entries Page Component
function TimeEntriesPage() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoading(true);
      try {
        const response = await timeEntriesAPI.getAll();
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);
        const currentUser = getCurrentUser();

        const transformedEntries = data.map(entry => {
          const userName = getEntryUserLabel(entry, new Map(), currentUser);

          return {
            id: entry._id || entry.id,
            projectName: entry.project?.name || entry.projectName || '--',
            taskName: entry.task || entry.taskName || '--',
            date: entry.date ? new Date(entry.date).toLocaleDateString() : '--',
            timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '--',
            user: userName,
            billable: entry.billable !== undefined ? entry.billable : false,
            notes: entry.description || entry.notes || '--',
          };
        });

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries");
        setTimeEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shadow-md" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
        <h1 className="text-xl font-semibold m-0">
          Time Entries
        </h1>
        <button
          onClick={() => navigate('/time-tracking/timesheet')}
          className="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-blue-600"
        >
          Back to Timesheet
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center py-16 px-5">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading time entries...</p>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-16 px-5 text-gray-500">
            <p className="text-lg mb-2">No time entries found</p>
            <p className="text-sm">Create your first time entry to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Billable</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.projectName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.taskName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.timeSpent || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getEntryUserLabel(entry, new Map(), getCurrentUser())}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.billable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{entry.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TimesheetTable() {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [billingStatusExpanded, setBillingStatusExpanded] = useState(true);
  const [showCustomView, setShowCustomView] = useState(false);
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [showNewLogEntryDropdown, setShowNewLogEntryDropdown] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerNotes, setTimerNotes] = useState('');
  const [associatedProject, setAssociatedProject] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState('');
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [showProjectFields, setShowProjectFields] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [isCreatingTaskInline, setIsCreatingTaskInline] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [hoveredMenu, setHoveredMenu] = useState(null); // 'sort', 'import', 'export', 'preferences'
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [openDropdownEntryId, setOpenDropdownEntryId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState("single"); // "single" | "bulk"
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [preferencesSubmenuOpen, setPreferencesSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('date'); // 'date', 'project', 'user', 'time'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showExportProjectsModal, setShowExportProjectsModal] = useState(false);
  const [exportCurrentViewStep, setExportCurrentViewStep] = useState(1);
  const [exportProjectsStep, setExportProjectsStep] = useState(1);
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
  const LOCAL_TIMESHEET_COLUMNS_KEY = "taban_timesheet_columns";
  const [selectedView, setSelectedView] = useState('All');
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [criteria, setCriteria] = useState([{ id: 1, field: '', comparator: '', value: '' }]);
  const [visibility, setVisibility] = useState('only-me');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('otherDetails'); // 'otherDetails' or 'comments'
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [editedEntryData, setEditedEntryData] = useState(null);
  const [showEntryMenu, setShowEntryMenu] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date()); // Current month/year for calendar
  const [selectedDateForLogEntry, setSelectedDateForLogEntry] = useState(null); // Selected date for new log entry
  const [selectedEntries, setSelectedEntries] = useState([]); // Selected time entries for bulk actions
  const [isTimerHydrated, setIsTimerHydrated] = useState(false);
  const [showTimesheetColumnsModal, setShowTimesheetColumnsModal] = useState(false);
  const [draftTimesheetColumns, setDraftTimesheetColumns] = useState<string[]>([]);
  const [timesheetColumnsSearchTerm, setTimesheetColumnsSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const periodDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const newLogEntryDropdownRef = useRef(null);
  const entryMenuRef = useRef(null);
  const taskDropdownRef = useRef(null);
  const customerFilterRef = useRef(null);
  const projectFilterRef = useRef(null);
  const userFilterRef = useRef(null);

  const timesheetViews = [
    { id: 'All', label: 'All' },
    { id: 'Invoiced', label: 'Invoiced' },
    { id: 'Unbilled', label: 'Unbilled' }
  ];
  const timesheetColumnOptions = [
    { key: 'date', label: 'Date', locked: true },
    { key: 'project', label: 'Project' },
    { key: 'customer', label: 'Customer' },
    { key: 'task', label: 'Task' },
    { key: 'user', label: 'User' },
    { key: 'time', label: 'Time' },
    { key: 'totalCost', label: 'Total Cost' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'customerApprovals', label: 'Customer Approvals' },
    { key: 'billingStatus', label: 'Billing Status' },
    { key: 'projectHead', label: 'Project Head' },
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(LOCAL_TIMESHEET_COLUMNS_KEY);
    const fallback = timesheetColumnOptions.map((col) => col.key).filter((key) => key !== "projectHead");

    if (!saved) return fallback;

    try {
      const parsed = JSON.parse(saved);
      const validKeys = Array.isArray(parsed)
        ? parsed.filter((key) => timesheetColumnOptions.some((col) => col.key === key))
        : fallback;
      return Array.from(new Set([
        ...validKeys,
        ...timesheetColumnOptions.filter((col) => col.locked).map((col) => col.key),
      ]));
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_TIMESHEET_COLUMNS_KEY, JSON.stringify(selectedColumns));
  }, [selectedColumns]);

  const visibleTimesheetColumns = useMemo(
    () => timesheetColumnOptions.filter((col) => selectedColumns.includes(col.key)),
    [selectedColumns]
  );

  const filteredTimesheetColumnOptions = useMemo(() => {
    const query = timesheetColumnsSearchTerm.trim().toLowerCase();
    if (!query) return timesheetColumnOptions;
    return timesheetColumnOptions.filter((column) => column.label.toLowerCase().includes(query));
  }, [timesheetColumnsSearchTerm]);

  // Log Entry Form State
  const [logEntryData, setLogEntryData] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    projectName: '',
    taskName: '',
    timeSpent: '',
    billable: true,
    user: '',
    notes: ''
  });

  // Filter selections state
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('All');
  const [periodSearchTerm, setPeriodSearchTerm] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProjectFilterDropdown, setShowProjectFilterDropdown] = useState(false);
  const [showUserFilterDropdown, setShowUserFilterDropdown] = useState(false);

  // Get projects from localStorage for dropdown
  const [projects, setProjects] = useState([]);

  // Load time entries from database (declare before useMemo that uses it)
  const [timeEntries, setTimeEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const currentUser = useMemo(() => getCurrentUser(), []);

  const timerTaskOptions = useMemo(() => {
    const selectedProject = projects.find((project) => project.projectName === selectedProjectForTimer);
    const tasks = selectedProject?.tasks || [];
    return tasks
      .map((task) => task?.taskName || task?.name || task?.title || "")
      .filter((name) => Boolean(name));
  }, [projects, selectedProjectForTimer]);

  // Extract unique customers from projects
  const customers = useMemo(() => {
    const customerSet = new Set();
    projects.forEach(project => {
      if (project.customerName) {
        customerSet.add(project.customerName);
      }
    });
    return Array.from(customerSet).map((name, index) => ({ id: index + 1, name }));
  }, [projects]);

  const [systemUsers, setSystemUsers] = useState([]);

  // Extract unique users from all projects and time entries
  const users = useMemo(() => {
    const userMap = new Map();

    const addUser = (user) => {
      if (!user || typeof user !== 'object') return;
      const id = getUserDisplayId(user);
      const name = getUserDisplayName(user);
      if (!id || !name) return;
      userMap.set(id, {
        id,
        name,
        email: String(user.email || '').trim()
      });
    };

    addUser(currentUser);

    // Add users from projects
    projects.forEach(project => {
      const projectUsers = project.users || project.assignedTo || [];
      if (Array.isArray(projectUsers)) {
        projectUsers.forEach(user => {
          if (user && typeof user === 'object') {
            addUser(user);
          } else if (typeof user === 'string') {
            if (!isLikelyId(user)) {
              userMap.set(user, { id: user, name: user, email: '' });
            }
          }
        });
      }
    });

    // Add users from time entries
    timeEntries.forEach(entry => {
      const userName = entry.userName || (typeof entry.user === 'string' && !isLikelyId(entry.user) ? entry.user : '');
      if (userName && userName !== '--' && !userMap.has(userName)) {
        const userId = String(entry.userId || entry.user || '').trim();
        if (userId) {
          userMap.set(userId, {
            id: userId,
            name: userName,
            email: ''
          });
        }
      }
    });

    return Array.from(userMap.values());
  }, [projects, timeEntries]);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      if (user?.id) {
        map.set(String(user.id), user);
      }
    });
    systemUsers.forEach((user) => {
      const id = user?._id || user?.id;
      if (id) {
        map.set(String(id), {
          id,
          name: getUserDisplayName(user),
          email: user?.email || ''
        });
      }
    });
    return map;
  }, [users, systemUsers]);

  const getProjectForEntry = (entry) => {
    if (!entry) return null;
    return projects.find((p) => (
      (entry.projectId && (p.id === entry.projectId || p._id === entry.projectId)) ||
      (entry.projectNumber && p.projectNumber === entry.projectNumber) ||
      (entry.projectName && p.projectName === entry.projectName)
    )) || null;
  };

  const getProjectName = (entry) => {
    const project = getProjectForEntry(entry);
    return project?.projectName || entry?.projectName || '--';
  };

  const getCustomerName = (entry) => {
    const project = getProjectForEntry(entry);
    return project?.customerName || '--';
  };

  const getUserName = (entry) => {
    return getEntryUserLabel(entry, userById, currentUser);
  };

  const getTimesheetColumnValue = (entry, key) => {
    switch (key) {
      case 'date':
        return entry?.date || '--';
      case 'project':
        return getProjectName(entry);
      case 'customer':
        return getCustomerName(entry);
      case 'task':
        return entry?.taskName || entry?.task || '--';
      case 'user':
        return getUserName(entry);
      case 'time':
        return entry?.timeSpent || '00:00';
      case 'totalCost': {
        const cost = Number(entry?.totalCost ?? entry?.billingCost ?? entry?.cost ?? 0);
        return `$${cost.toFixed(2)}`;
      }
      case 'approvals':
        return entry?.approvals || '--';
      case 'customerApprovals':
        return entry?.customerApprovals || entry?.customerApproval || '--';
      case 'billingStatus':
        return entry?.billingStatus || 'Unbilled';
      case 'projectHead':
        return entry?.projectHead || '--';
      default:
        return '--';
    }
  };

  const handleOpenTimesheetColumnsModal = () => {
    setTimesheetColumnsSearchTerm("");
    setShowTimesheetColumnsModal(true);
  };

  const handleCloseTimesheetColumnsModal = () => {
    setShowTimesheetColumnsModal(false);
    setTimesheetColumnsSearchTerm("");
  };

  const handleSaveTimesheetColumns = () => {
    const lockedColumns = timesheetColumnOptions.filter((column) => column.locked).map((column) => column.key);
    setSelectedColumns(Array.from(new Set([...draftTimesheetColumns, ...lockedColumns])));
    handleCloseTimesheetColumnsModal();
  };

  const handleToggleTimesheetColumn = (key: string) => {
    const column = timesheetColumnOptions.find((item) => item.key === key);
    if (!column || column.locked) return;
    setDraftTimesheetColumns((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const resolveUserIdForEntry = (entry) => {
    if (!entry) return '';
    if (entry.userId) return entry.userId;
    if (entry.user && isLikelyId(entry.user)) return entry.user;
    const name = entry.userName || entry.user || '';
    if (!name) return '';
    const match = [...systemUsers, ...users].find((u) =>
      (u?.name || u?.fullName || u?.username || u?.email) === name
    );
    return match?._id || match?.id || '';
  };

  // Load comments when entry is selected
  useEffect(() => {
    if (selectedEntry) {
      const allComments = JSON.parse(localStorage.getItem('timesheetComments') || '{}');
      const entryComments = allComments[selectedEntry.id] || [];
      setComments(entryComments);
    } else {
      setComments([]);
    }
  }, [selectedEntry]);

  const formatDuration = (entry) => {
    const hours = Number(entry?.hours ?? 0);
    const minutes = Number(entry?.minutes ?? 0);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && (hours > 0 || minutes > 0)) {
      return `${String(hours).padStart(2, "0")} hrs : ${String(minutes).padStart(2, "0")} mins`;
    }
    const match = String(entry?.timeSpent || "").match(/(\d+)\s*h.*?(\d+)\s*m/i);
    if (match) {
      const h = Number(match[1] || 0);
      const m = Number(match[2] || 0);
      return `${String(h).padStart(2, "0")} hrs : ${String(m).padStart(2, "0")} mins`;
    }
    return "00 hrs : 00 mins";
  };

  const toHHMM = (entry) => {
    if (!entry) return "00:00";
    if (entry.hours || entry.minutes) {
      const h = Number(entry.hours || 0);
      const m = Number(entry.minutes || 0);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const match = String(entry.timeSpent || "").match(/(\d+)\s*h.*?(\d+)\s*m/i);
    if (match) {
      const h = Number(match[1] || 0);
      const m = Number(match[2] || 0);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    if (typeof entry.timeSpent === "string" && entry.timeSpent.includes(":")) {
      return entry.timeSpent;
    }
    return "00:00";
  };

  const handleCloneSelectedEntry = async () => {
    if (!selectedEntry) return;
    try {
      const projectObj = getProjectForEntry(selectedEntry);
      const [hours, minutes] = String(toHHMM(selectedEntry)).split(":").map((v) => Number(v) || 0);
      const payload = {
        project: selectedEntry.projectId || projectObj?.id || projectObj?._id,
        user: resolveUserIdForEntry(selectedEntry),
        date: selectedEntry.date ? new Date(selectedEntry.date).toISOString() : new Date().toISOString(),
        hours,
        minutes,
        description: selectedEntry.notes || selectedEntry.description || '',
        billable: selectedEntry.billable !== undefined ? selectedEntry.billable : true,
        task: selectedEntry.taskName || selectedEntry.task || '',
      };
      await timeEntriesAPI.create(payload);
      toast.success("Time entry cloned successfully!");
      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
      setShowEntryMenu(false);
    } catch (error) {
      console.error("Error cloning time entry:", error);
      toast.error("Failed to clone time entry");
    }
  };

  const openDeleteConfirm = (mode, ids) => {
    setDeleteMode(mode);
    setPendingDeleteIds(ids);
    setShowDeleteConfirm(true);
  };

  const getDeleteConfirmTitle = () => {
    if (deleteMode === "bulk") {
      return `Delete ${pendingDeleteIds.length} time entries?`;
    }
    const userName = selectedEntry && getUserName(selectedEntry) !== "--" ? getUserName(selectedEntry) : "this user";
    return `Delete ${userName}'s log entry?`;
  };

  const getDeleteConfirmMessage = () => {
    if (deleteMode === "bulk") {
      return "You cannot retrieve these time entries once they have been deleted.";
    }
    const userName = selectedEntry && getUserName(selectedEntry) !== "--" ? getUserName(selectedEntry) : "this log entry";
    return `You cannot retrieve ${userName}'s log entry once it has been deleted.`;
  };

  const handleDeleteSelectedEntry = () => {
    if (!selectedEntry) return;
    openDeleteConfirm("single", [selectedEntry.id]);
    setShowEntryMenu(false);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteIds.length) {
      setShowDeleteConfirm(false);
      return;
    }
    try {
      if (deleteMode === "single") {
        await timeEntriesAPI.delete(pendingDeleteIds[0]);
        toast.success("Time entry deleted successfully!");
        setSelectedEntry(null);
      } else {
        await Promise.all(pendingDeleteIds.map((entryId) => timeEntriesAPI.delete(entryId)));
        toast.success("Successfully deleted entries.");
        setSelectedEntries([]);
      }
      const response = await timeEntriesAPI.getAll();
      setTimeEntries(Array.isArray(response) ? response : (response?.data || []));
      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
    } catch (error) {
      console.error("Error deleting time entry:", error);
      toast.error("Failed to delete time entry");
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteIds([]);
    }
  };

  const handleAddComment = () => {
    if (!selectedEntry || !commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const allComments = JSON.parse(localStorage.getItem('timesheetComments') || '{}');
    const entryComments = allComments[selectedEntry.id] || [];
    const nextComments = [...entryComments, newComment];
    allComments[selectedEntry.id] = nextComments;
    localStorage.setItem('timesheetComments', JSON.stringify(allComments));
    setComments(nextComments);
    setCommentText('');
  };

  // Load projects from database
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await projectsAPI.getAll();
        // Handle response format: { success: true, data: [...] } or direct array
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);

        // Transform database projects to match frontend format
        const transformedProjects = data.map(project => ({
          id: project._id || project.id,
          projectName: project.name || project.projectName,
          projectNumber: project.projectNumber || project.id,
          customerName: project.customer?.name || project.customerName,
          customerId: project.customer?._id || project.customerId,
          description: project.description || '',
          startDate: project.startDate || '',
          endDate: project.endDate || '',
          status: project.status || 'planning',
          budget: project.budget || 0,
          currency: project.currency || 'USD',
          billable: project.billable !== undefined ? project.billable : true,
          billingRate: project.billingRate || 0,
          assignedTo: project.assignedTo || [],
          tags: project.tags || [],
          tasks: project.tasks || [],
          users: project.assignedTo || [],
          ...project // Keep all other fields
        }));

        setProjects(transformedProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects: " + (error.message || "Unknown error"));
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();

    // Listen for custom events (when projects are updated from other components)
    const handleProjectUpdate = () => {
      fetchProjects();
    };
    window.addEventListener('projectUpdated', handleProjectUpdate);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getAll();
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);
        setSystemUsers(data);
      } catch (error) {
        console.error("Error loading users:", error);
        setSystemUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Get tasks from selected project
  const selectedProject = projects.find(p => p.projectName === logEntryData.projectName);
  const availableTasks = selectedProject?.tasks || [];

  const periodOptions = useMemo(() => ([
    {
      group: "Current",
      items: [
        { id: 'Today', label: 'Today' },
        { id: 'This Week', label: 'This Week' },
        { id: 'This Month', label: 'This Month' },
        { id: 'This Quarter', label: 'This Quarter' },
        { id: 'This Year', label: 'This Year' },
      ],
    },
    {
      group: "Previous",
      items: [
        { id: 'Yesterday', label: 'Yesterday' },
        { id: 'Previous Week', label: 'Previous Week' },
        { id: 'Previous Month', label: 'Previous Month' },
        { id: 'Previous Quarter', label: 'Previous Quarter' },
        { id: 'Previous Year', label: 'Previous Year' },
      ],
    },
  ]), []);

  const filterCustomers = useMemo(() => {
    const unique = new Map();
    projects.forEach((project) => {
      const customerName = String(project.customerName || '').trim();
      if (customerName) unique.set(customerName, customerName);
    });
    timeEntries.forEach((entry) => {
      const customerName = String(entry.customerName || '').trim();
      if (customerName && customerName !== '--') unique.set(customerName, customerName);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [projects, timeEntries]);

  const filterProjects = useMemo(() => {
    const unique = new Map();
    projects.forEach((project) => {
      const projectName = String(project.projectName || '').trim();
      if (projectName) unique.set(projectName, projectName);
    });
    timeEntries.forEach((entry) => {
      const projectName = String(entry.projectName || '').trim();
      if (projectName && projectName !== '--') unique.set(projectName, projectName);
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [projects, timeEntries]);

  const filterUsers = useMemo(() => {
    const unique = new Map();
    const normalizeLabel = (value) => String(value || "").trim().toLowerCase();

    [...users, ...systemUsers].forEach((user) => {
      const userName = getUserDisplayName(user);
      const userId = getUserDisplayId(user);
      if (!userName) return;
      const key = normalizeLabel(userName);
      if (!unique.has(key)) {
        unique.set(key, userName);
      }
    });

    timeEntries.forEach((entry) => {
      const userName = String(getUserName(entry) || '').trim();
      if (!userName || userName === '--') return;
      const key = normalizeLabel(userName);
      if (!unique.has(key)) {
        unique.set(key, userName);
      }
    });

    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [users, systemUsers, timeEntries]);

  // Load entries on mount and when needed
  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoadingEntries(true);
      try {
        const response = await timeEntriesAPI.getAll();
        // Handle response format: { success: true, data: [...] } or direct array
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);
        const currentUser = getCurrentUser();

        // Transform database entries to match frontend format
        const transformedEntries = data.map(entry => {
          const isUserObject = typeof entry.user === 'object' && entry.user !== null;
          const userName = isUserObject
            ? (getUserDisplayName(entry.user) || entry.userName || '')
            : getEntryUserLabel(entry, new Map(), currentUser);
          const rawUser = !isUserObject ? entry.user : undefined;
          const projectId = typeof entry.project === 'string'
            ? entry.project
            : (entry.project?._id || entry.projectId);

          return {
            id: entry._id || entry.id,
            projectId: projectId,
            projectName: entry.project?.name || entry.projectName || '',
            projectNumber: entry.project?.projectNumber || entry.projectNumber,
            customerName: entry.project?.customer?.name || entry.customerName || '',
            dateValue: entry.date ? new Date(entry.date) : new Date(),
            userId: isUserObject ? (entry.user?._id || entry.userId) : (entry.userId || rawUser),
            userName: userName,
            user: userName || (typeof rawUser === 'string' ? rawUser : ''), // keep fallback string (may be id)
            date: entry.date ? new Date(entry.date).toLocaleDateString() : new Date().toLocaleDateString(),
            hours: entry.hours || 0,
            minutes: entry.minutes || 0,
            timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
            description: entry.description || '',
            task: entry.task || entry.taskName || '',
            taskName: entry.task || entry.taskName || '',
            billable: entry.billable !== undefined ? entry.billable : true,
            billingRate: entry.billingRate || 0,
            notes: entry.description || entry.notes || '',
            billingStatus: entry.billingStatus || 'Unbilled',
            // Don't spread entry to avoid overwriting our transformed fields
          };
        });

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries: " + (error.message || "Unknown error"));
        setTimeEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };

    fetchTimeEntries();

    // Listen for custom events (when entries are updated from other components)
    const handleTimeEntryUpdate = () => {
      fetchTimeEntries();
    };
    window.addEventListener('timeEntryUpdated', handleTimeEntryUpdate);

    return () => {
      window.removeEventListener('timeEntryUpdated', handleTimeEntryUpdate);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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
          setHoveredMenu(null);
        }
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
      }
      if (newLogEntryDropdownRef.current && !newLogEntryDropdownRef.current.contains(event.target)) {
        setShowNewLogEntryDropdown(false);
      }
      if (entryMenuRef.current && !entryMenuRef.current.contains(event.target)) {
        setShowEntryMenu(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target)) {
        setShowPeriodDropdown(false);
      }
      if (customerFilterRef.current && !customerFilterRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
      if (projectFilterRef.current && !projectFilterRef.current.contains(event.target)) {
        setShowProjectFilterDropdown(false);
      }
      if (userFilterRef.current && !userFilterRef.current.contains(event.target)) {
        setShowUserFilterDropdown(false);
      }
      // Close row dropdown when clicking outside (will be handled by checking if click target is inside dropdown)
      if (openDropdownEntryId) {
        const dropdownElement = document.querySelector(`[data-dropdown-entry-id="${openDropdownEntryId}"]`);
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setOpenDropdownEntryId(null);
        }
      }
    }

    if (showDropdown || showMoreMenu || showMoreDropdown || showNewLogEntryDropdown || openDropdownEntryId || sortSubmenuOpen || importSubmenuOpen || exportSubmenuOpen || preferencesSubmenuOpen || showEntryMenu) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showMoreMenu, showMoreDropdown, showNewLogEntryDropdown, openDropdownEntryId, sortSubmenuOpen, importSubmenuOpen, exportSubmenuOpen, preferencesSubmenuOpen, showEntryMenu]);

  useEffect(() => {
    setShowEntryMenu(false);
  }, [selectedEntry]);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState) as TimerState;
      const computedElapsed = calculateElapsedTime(timerState);
      setElapsedTime(computedElapsed);
      setIsTimerRunning(timerState.isTimerRunning || false);
      setTimerNotes(timerState.timerNotes || '');
      setAssociatedProject(timerState.associatedProject || '');
      setSelectedProjectForTimer(timerState.selectedProjectForTimer || timerState.associatedProject || '');
      setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
      setIsBillable(timerState.isBillable !== undefined ? timerState.isBillable : true);
      if (timerState.isTimerRunning && !timerState.startTime) {
        const updatedTimerState = {
          ...timerState,
          startTime: Date.now(),
          pausedElapsedTime: computedElapsed,
        };
        localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
      }
    }
    setIsTimerHydrated(true);
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (!isTimerHydrated) return;

    const savedTimerState = localStorage.getItem('timerState');
    let timerState: TimerState = {};

    if (savedTimerState) {
      try {
        timerState = (JSON.parse(savedTimerState) || {}) as TimerState;
      } catch {
        timerState = {};
      }
    }

    const updatedState: TimerState = {
      ...timerState,
      elapsedTime,
      isTimerRunning,
      timerNotes,
      associatedProject,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable,
      lastUpdated: Date.now(),
    };

    if (isTimerRunning) {
      if (!updatedState.startTime) {
        updatedState.startTime = Date.now();
        updatedState.pausedElapsedTime = elapsedTime;
      }
    } else if (updatedState.startTime) {
      updatedState.pausedElapsedTime = elapsedTime;
      delete updatedState.startTime;
    }

    localStorage.setItem('timerState', JSON.stringify(updatedState));
  }, [isTimerHydrated, elapsedTime, isTimerRunning, timerNotes, associatedProject, selectedProjectForTimer, selectedTaskForTimer, isBillable]);

  // Listen for storage changes (when timer is updated from other page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'timerState' && e.newValue) {
        const timerState = JSON.parse(e.newValue) as TimerState;
        setElapsedTime(calculateElapsedTime(timerState));
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
        setSelectedProjectForTimer(timerState.selectedProjectForTimer || timerState.associatedProject || '');
        setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
        setIsBillable(timerState.isBillable !== undefined ? timerState.isBillable : true);
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState) as TimerState;
        setElapsedTime(calculateElapsedTime(timerState));
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
        setSelectedProjectForTimer(timerState.selectedProjectForTimer || timerState.associatedProject || '');
        setSelectedTaskForTimer(timerState.selectedTaskForTimer || '');
        setIsBillable(timerState.isBillable !== undefined ? timerState.isBillable : true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timerStateUpdated', handleCustomStorage);

    // Poll for changes (for same-tab updates)
    const pollInterval = setInterval(() => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState) as TimerState;
        if (timerState.lastUpdated && timerState.lastUpdated > (Date.now() - 2000)) {
          setElapsedTime(calculateElapsedTime(timerState));
          setIsTimerRunning(timerState.isTimerRunning || false);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timerStateUpdated', handleCustomStorage);
      clearInterval(pollInterval);
    };
  }, []);

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        const savedTimerState = localStorage.getItem('timerState');
        if (!savedTimerState) return;

        const timerState = JSON.parse(savedTimerState) as TimerState;
        const newTime = calculateElapsedTime(timerState);
        setElapsedTime(newTime);

        const updatedTimerState: TimerState = {
          ...timerState,
          elapsedTime: newTime,
          isTimerRunning: true,
          timerNotes,
          associatedProject,
          selectedProjectForTimer,
          selectedTaskForTimer,
          isBillable,
          lastUpdated: Date.now(),
        };

        if (!updatedTimerState.startTime) {
          updatedTimerState.startTime = Date.now();
          updatedTimerState.pausedElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
        }

        localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
        window.dispatchEvent(new CustomEvent('timerStateUpdated'));
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
  }, [isTimerRunning, timerNotes, associatedProject, selectedProjectForTimer, selectedTaskForTimer, isBillable]);

  useEffect(() => {
    if (showTimesheetColumnsModal) {
      setDraftTimesheetColumns([...selectedColumns]);
    }
  }, [showTimesheetColumnsModal, selectedColumns]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  };

  // Format time as HH:MM for display in timer controls
  const formatTimeShort = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimeVerbose = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(secs).padStart(2, "0")}s`;
  };

  const calculateElapsedTime = (timerState) => {
    if (!timerState) return 0;

    if (timerState.isTimerRunning && timerState.startTime) {
      const elapsedFromStart = Math.floor((Date.now() - timerState.startTime) / 1000);
      return (timerState.pausedElapsedTime || 0) + Math.max(0, elapsedFromStart);
    }

    return timerState.pausedElapsedTime || timerState.elapsedTime || 0;
  };

  const handleResumeTimer = () => {
    const savedTimerState = localStorage.getItem('timerState');
    const timerState = savedTimerState ? (JSON.parse(savedTimerState) as TimerState) : {};
    const pausedElapsed = timerState.pausedElapsedTime || timerState.elapsedTime || elapsedTime || 0;

    const updatedTimerState: TimerState = {
      ...timerState,
      startTime: Date.now(),
      pausedElapsedTime: pausedElapsed,
      elapsedTime: pausedElapsed,
      isTimerRunning: true,
      timerNotes,
      associatedProject,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable,
      lastUpdated: Date.now(),
    };

    localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
    setElapsedTime(pausedElapsed);
    setIsTimerRunning(true);
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleStartTimerFromModal = () => {
    if (!selectedProjectForTimer || !selectedTaskForTimer) {
      toast.error("Please select a project and task");
      return;
    }

    const timerState: TimerState = {
      startTime: Date.now(),
      pausedElapsedTime: 0,
      elapsedTime: 0,
      isTimerRunning: true,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable,
      lastUpdated: Date.now(),
    };

    localStorage.setItem('timerState', JSON.stringify(timerState));
    setElapsedTime(0);
    setIsTimerRunning(true);
    setAssociatedProject(selectedProjectForTimer);
    setShowTimerModal(false);
    setShowProjectFields(false);
    setShowTaskDropdown(false);
    setIsCreatingTaskInline(false);
    setTaskSearchTerm('');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
    toast.success('The timer has been started.');
  };

  const handlePauseTimer = () => {
    const savedTimerState = localStorage.getItem('timerState');
    const timerState = savedTimerState ? (JSON.parse(savedTimerState) as TimerState) : {};
    const finalElapsedTime = calculateElapsedTime(timerState);

    setIsTimerRunning(false);
    setElapsedTime(finalElapsedTime);

    const updatedState: TimerState = {
      ...timerState,
      elapsedTime: finalElapsedTime,
      pausedElapsedTime: finalElapsedTime,
      isTimerRunning: false,
      timerNotes,
      associatedProject,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable,
      lastUpdated: Date.now(),
    };

    if (updatedState.startTime) {
      delete updatedState.startTime;
    }

    localStorage.setItem('timerState', JSON.stringify(updatedState));
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleStopTimer = async () => {
    const savedTimerState = localStorage.getItem('timerState');
    const timerState = savedTimerState ? (JSON.parse(savedTimerState) as TimerState) : {};
    const finalElapsedTime = calculateElapsedTime(timerState);
    const activeProjectName = associatedProject || selectedProjectForTimer || timerState.associatedProject || timerState.selectedProjectForTimer || '';
    const activeTaskName = selectedTaskForTimer || timerState.selectedTaskForTimer || '';
    const activeBillable = timerState.isBillable !== undefined ? timerState.isBillable : isBillable;

    setIsTimerRunning(false);
    setElapsedTime(finalElapsedTime);

    // Save the time entry
    if (finalElapsedTime > 0 && activeProjectName) {
      try {
        // Find project
        const projectObj = projects.find(p => p.projectName === activeProjectName);
        if (!projectObj) {
          toast.error('Invalid project selected');
          return;
        }

        // Get current user
        const { getCurrentUser } = await import("../../services/auth");
        const currentUser = getCurrentUser();
        if (!currentUser) {
          toast.error('User not found. Please log in again.');
          return;
        }

        // Parse time (formatTimeShort returns "Xh Ym" format)
        const timeStr = formatTimeShort(finalElapsedTime);
        const hoursMatch = timeStr.match(/(\d+)h/);
        const minutesMatch = timeStr.match(/(\d+)m/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        // Create time entry
        const newEntry = {
          project: projectObj.id,
          user: currentUser.id,
          date: new Date().toISOString(),
          hours: hours,
          minutes: minutes,
          description: timerNotes || '',
          billable: activeBillable,
          task: activeTaskName,
        };

        await timeEntriesAPI.create(newEntry);

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

        toast.success('Time entry created successfully!');
      } catch (error) {
        console.error("Error saving timer entry:", error);
        toast.error("Failed to save time entry");
      }
    }
    // Reset timer
    setElapsedTime(0);
    setTimerNotes('');
    setAssociatedProject('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    setIsBillable(true);
    setShowTimerModal(false);
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleDeleteTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setTimerNotes('');
    setAssociatedProject('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    setIsBillable(true);
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  // Sort options for timesheet entries
  const sortOptions = ['Date', 'Project Name', 'User', 'Time'];

  // Sorting function
  const getSortedEntries = (entries) => {
    const sorted = [...entries];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'project':
          aValue = (a.projectName || "").toLowerCase();
          bValue = (b.projectName || "").toLowerCase();
          break;
        case 'user':
          aValue = getUserName(a).toLowerCase();
          bValue = getUserName(b).toLowerCase();
          break;
        case 'time':
          // Parse time strings like "2h 30m" to minutes
          const parseTime = (timeStr) => {
            if (!timeStr) return 0;
            const hours = (timeStr.match(/(\d+)h/) || [0, 0])[1];
            const minutes = (timeStr.match(/(\d+)m/) || [0, 0])[1];
            return parseInt(hours) * 60 + parseInt(minutes);
          };
          aValue = parseTime(a.timeSpent);
          bValue = parseTime(b.timeSpent);
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

  const getPeriodRange = (period) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === "Today") {
      // already set to today
    } else if (period === "This Week") {
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
    } else if (period === "This Month") {
      start.setDate(1);
    } else if (period === "This Quarter") {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
    } else if (period === "This Year") {
      start.setMonth(0, 1);
    } else if (period === "Yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (period === "Last Month") {
      start.setMonth(start.getMonth() - 1, 1);
      end.setMonth(end.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === "Previous Week") {
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff - 7);
      end.setDate(start.getDate() + 6);
    } else if (period === "Previous Quarter") {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3 - 3;
      start.setMonth(quarterStartMonth, 1);
      end.setMonth(quarterStartMonth + 3, 0);
    } else if (period === "Previous Year") {
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
    }

    return { start, end };
  };

  // Filter entries based on selected filters
  const getFilteredEntries = (entries) => {
    let filtered = [...entries];
    if (selectedView === 'Invoiced') {
      filtered = filtered.filter(e => e.billingStatus === 'Invoiced');
    } else if (selectedView === 'Unbilled') {
      filtered = filtered.filter(e => e.billingStatus === 'Unbilled' || !e.billingStatus);
    }

    if (selectedPeriodFilter !== "All") {
      const { start, end } = getPeriodRange(selectedPeriodFilter);
      filtered = filtered.filter((entry) => {
        const entryDate = entry?.dateValue ? new Date(entry.dateValue) : new Date(entry?.date || "");
        if (Number.isNaN(entryDate.getTime())) return false;
        return entryDate >= start && entryDate <= end;
      });
    }

    if (selectedCustomer) {
      filtered = filtered.filter((entry) => String(entry.customerName || "").trim() === selectedCustomer);
    }

    if (selectedProjectFilter) {
      filtered = filtered.filter((entry) => String(entry.projectName || "").trim() === selectedProjectFilter);
    }

    if (selectedUserFilter) {
      filtered = filtered.filter((entry) => String(getUserName(entry) || "").trim() === selectedUserFilter);
    }

    return filtered;
  };

  // Get sorted entries (memoized)
  const sortedEntries = useMemo(() => {
    const filtered = getFilteredEntries(timeEntries);
    return getSortedEntries(filtered);
  }, [timeEntries, selectedSort, sortDirection, selectedView, selectedPeriodFilter, selectedCustomer, selectedProjectFilter, selectedUserFilter]);

  const calendarEntries = useMemo(() => getFilteredEntries(timeEntries), [timeEntries, selectedView, selectedPeriodFilter, selectedCustomer, selectedProjectFilter, selectedUserFilter]);

  const calendarCells = useMemo(() => getCalendarWeeks(calendarDate), [calendarDate]);

  const calendarEntryMap = useMemo(() => {
    const map = new Map();
    calendarEntries.forEach((entry) => {
      const key = formatCalendarKey(entry?.date);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    return map;
  }, [calendarEntries]);

  const selectedCalendarDateKey = selectedDateForLogEntry ? formatCalendarKey(selectedDateForLogEntry) : "";
  const selectedCalendarEntries = selectedCalendarDateKey ? (calendarEntryMap.get(selectedCalendarDateKey) || []) : [];
  const selectedCalendarTotalMinutes = selectedCalendarEntries.reduce((sum, entry) => sum + (Number(entry.hours || 0) * 60) + Number(entry.minutes || 0), 0);
  const selectedCalendarTotalLabel = `${String(Math.floor(selectedCalendarTotalMinutes / 60)).padStart(2, "0")}:${String(selectedCalendarTotalMinutes % 60).padStart(2, "0")}`;
  const selectedCalendarUniqueUsers = new Set(selectedCalendarEntries.map((entry) => getUserName(entry)).filter((name) => name && name !== "--")).size;

  const monthDayTotals = useMemo(() => {
    const totals = new Map();
    calendarEntries.forEach((entry) => {
      const key = formatCalendarKey(entry?.date);
      if (!key) return;
      const current = totals.get(key) || 0;
      totals.set(key, current + (Number(entry.hours || 0) * 60) + Number(entry.minutes || 0));
    });
    return totals;
  }, [calendarEntries]);

  const goToPreviousMonth = () => {
    setCalendarDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1, 1);
      return next;
    });
  };

  const goToNextMonth = () => {
    setCalendarDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1, 1);
      return next;
    });
  };

  const moveSelectedCalendarDate = (days) => {
    if (!selectedDateForLogEntry) return;
    const next = new Date(selectedDateForLogEntry);
    next.setDate(next.getDate() + days);
    setSelectedDateForLogEntry(next);
  };

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    const sortMap = {
      'Date': 'date',
      'Project Name': 'project',
      'User': 'user',
      'Time': 'time'
    };
    const sortKey = sortMap[sortOption] || 'date';

    if (selectedSort === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedSort(sortKey);
      setSortDirection('desc');
    }
    setSortSubmenuOpen(false);
  };

  // Export function
  const exportTimesheets = (format, entriesToExport) => {
    const exportData = entriesToExport.slice(0, 25000);

    if (format === "csv") {
      const headers = ["Date", "Project Name", "Task", "Time", "User", "Billable", "Notes"];

      let csvContent = headers.join(",") + "\n";

      exportData.forEach((entry) => {
        const row = [
          `"${(entry.date || "").replace(/"/g, '""')}"`,
          `"${(entry.projectName || "").replace(/"/g, '""')}"`,
          `"${(entry.taskName || "").replace(/"/g, '""')}"`,
          `"${(entry.timeSpent || "").replace(/"/g, '""')}"`,
          `"${getUserName(entry).replace(/"/g, '""')}"`,
          entry.billable ? "Yes" : "No",
          `"${(entry.notes || "").replace(/"/g, '""')}"`,
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
    } else if (format === "json") {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `timesheets_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col w-full relative h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      {selectedEntries.length === 0 && (
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-30 shadow-sm">
          <div ref={dropdownRef} className="relative flex items-center gap-1.5">
            <span className="text-[26px] font-semibold text-gray-800">All Timesheets</span>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex h-6 w-6 items-center justify-center border-none bg-transparent p-0 text-[#156372] hover:text-[#0f4f5c] cursor-pointer"
              aria-label="Open view menu"
            >
              <ChevronDown size={12} />
            </button>
            {showDropdown && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                {timesheetViews.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => { setSelectedView(view.id); setShowDropdown(false); }}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center justify-between rounded border px-3 py-2 text-left text-sm ${selectedView === view.id ? "border-[#156372] bg-[#156372]/10 text-gray-800" : "border-transparent text-gray-700 hover:bg-gray-50"}`}
                  >
                    {view.label}
                  </button>
                ))}
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
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 cursor-pointer"
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
                  onClick={isTimerRunning ? handlePauseTimer : handleResumeTimer}
                  className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-[#2563eb] hover:bg-gray-50 cursor-pointer"
                >
                  {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  onClick={handleStopTimer}
                  className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-red-500 hover:bg-gray-50 cursor-pointer"
                  title="Stop timer"
                >
                  <Square size={12} />
                </button>
                <button
                  onClick={handleDeleteTimer}
                  className="flex h-9 w-8 items-center justify-center border-none bg-white text-gray-500 hover:bg-gray-50 cursor-pointer"
                  title="Delete timer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            <div className="relative flex items-center">
              <button
                onClick={() => setShowLogEntryForm(true)}
                className="flex h-9 items-center gap-1 whitespace-nowrap rounded-l-md border-none bg-[#156372] px-2.5 text-[12px] font-semibold text-white hover:bg-[#0f4f5c] cursor-pointer"
              >
                <Plus size={14} />
                New Log Entry
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewDropdown(!showNewDropdown);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-r-md border-none border-l border-white/20 bg-[#156372] text-white hover:bg-[#0f4f5c] cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
              {showNewDropdown && (
                <div className="absolute right-0 top-full z-[1200] mt-2 w-max min-w-[160px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                  <button
                    onClick={() => { navigate('/time-tracking/timesheet/weekly'); setShowNewDropdown(false); }}
                    className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Plus size={13} />
                    New Weekly Time Log
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-[#f4f4f4] p-0 text-gray-700 hover:bg-gray-200 cursor-pointer ml-1"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                <button
                  onClick={() => { exportTimesheets('csv', sortedEntries); setShowMoreMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                >
                  <Download size={14} />
                  Export as CSV
                </button>
                <button
                  onClick={() => { navigate('/time-tracking/timesheet/import'); setShowMoreMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                >
                  <Upload size={14} />
                  Import Timesheets
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedEntries.length > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {}}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Create Invoice
            </button>
            <button
              onClick={async () => {
                try {
                  await Promise.all(selectedEntries.map(entryId => timeEntriesAPI.update(entryId, { billingStatus: 'Invoiced' })));
                  const response = await timeEntriesAPI.getAll();
                  setTimeEntries(Array.isArray(response) ? response : (response?.data || []));
                  setSelectedEntries([]);
                  toast.success(`Successfully marked entries as invoiced.`);
                } catch (e) { toast.error("Failed to update entries"); }
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Mark as Invoiced
            </button>
            <button
              onClick={async () => {
                try {
                  await Promise.all(selectedEntries.map(entryId => timeEntriesAPI.update(entryId, { billingStatus: 'Unbilled' })));
                  const response = await timeEntriesAPI.getAll();
                  setTimeEntries(Array.isArray(response) ? response : (response?.data || []));
                  setSelectedEntries([]);
                  toast.success(`Successfully marked entries as unbilled.`);
                } catch (e) { toast.error("Failed to update entries"); }
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Mark as Unbilled
            </button>
            <button
              onClick={async () => {
                if (!selectedEntries.length) return;
                openDeleteConfirm("bulk", [...selectedEntries]);
              }}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 cursor-pointer"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-[#156372] px-2 py-0.5 text-xs font-semibold text-white">{selectedEntries.length}</span>
            <span className="text-sm text-gray-700">Selected</span>
            <span className="text-xs text-gray-400">Esc</span>
            <button
              onClick={() => setSelectedEntries([])}
              className="text-red-500 hover:text-red-600 cursor-pointer border-none bg-transparent flex items-center justify-center p-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {selectedEntries.length === 0 && viewMode === 'list' && (
        <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-semibold uppercase text-gray-500">
            <span>VIEW BY:</span>
          </div>

          <div className="relative" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setShowPeriodDropdown((value) => !value)}
              className="flex items-center gap-2 rounded-md border-none bg-transparent px-0 py-0 text-sm text-gray-700 cursor-pointer"
            >
              <span className="text-gray-500">Period:</span>
              <span className="font-medium text-gray-800">{selectedPeriodFilter}</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[220px] max-h-[320px] overflow-y-auto rounded-md bg-white py-2 shadow-lg">
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={periodSearchTerm}
                      onChange={(e) => setPeriodSearchTerm(e.target.value)}
                      placeholder="Search"
                      className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#156372]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriodFilter('All');
                    setShowPeriodDropdown(false);
                  }}
                  className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center justify-between rounded px-3 py-2 text-left text-sm ${selectedPeriodFilter === 'All' ? "bg-[#156372]/10 text-gray-800" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  All
                </button>
                {periodOptions.map((group) => {
                  const filteredItems = group.items.filter((option) =>
                    option.label.toLowerCase().includes(periodSearchTerm.trim().toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={group.group} className="mt-1">
                      <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {group.group}
                      </div>
                      {filteredItems.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedPeriodFilter(option.id);
                            setShowPeriodDropdown(false);
                          }}
                          className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center justify-between rounded px-3 py-2 text-left text-sm ${selectedPeriodFilter === option.id ? "bg-[#156372]/10 text-gray-800" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <div className="relative" ref={customerFilterRef}>
            <button
              type="button"
              onClick={() => setShowCustomerDropdown((value) => !value)}
              className="flex items-center gap-2 rounded-md border-none bg-transparent px-0 py-0 text-sm text-gray-700 cursor-pointer"
            >
              <span className={selectedCustomer ? "text-gray-800" : "text-gray-500"}>{selectedCustomer || "Select customer"}</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>
            {showCustomerDropdown && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[180px] rounded-md bg-white py-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer('');
                    setShowCustomerDropdown(false);
                  }}
                  className="mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  All customers
                </button>
                {filterCustomers.map((customer) => (
                  <button
                    key={customer}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDropdown(false);
                    }}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm ${selectedCustomer === customer ? "bg-[#156372]/10 text-gray-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {customer}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={projectFilterRef}>
            <button
              type="button"
              onClick={() => setShowProjectFilterDropdown((value) => !value)}
              className="flex items-center gap-2 rounded-md border-none bg-transparent px-0 py-0 text-sm text-gray-700 cursor-pointer"
            >
              <span className={selectedProjectFilter ? "text-gray-800" : "text-gray-500"}>{selectedProjectFilter || "Select a project"}</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>
            {showProjectFilterDropdown && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[180px] rounded-md bg-white py-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectFilter('');
                    setShowProjectFilterDropdown(false);
                  }}
                  className="mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  All projects
                </button>
                {filterProjects.map((project) => (
                  <button
                    key={project}
                    type="button"
                    onClick={() => {
                      setSelectedProjectFilter(project);
                      setShowProjectFilterDropdown(false);
                    }}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm ${selectedProjectFilter === project ? "bg-[#156372]/10 text-gray-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {project}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={userFilterRef}>
            <button
              type="button"
              onClick={() => setShowUserFilterDropdown((value) => !value)}
              className="flex items-center gap-2 rounded-md border-none bg-transparent px-0 py-0 text-sm text-gray-700 cursor-pointer"
            >
              <span className={selectedUserFilter ? "text-gray-800" : "text-gray-500"}>{selectedUserFilter || "Select user"}</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>
            {showUserFilterDropdown && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[180px] rounded-md bg-white py-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserFilter('');
                    setShowUserFilterDropdown(false);
                  }}
                  className="mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  All users
                </button>
                {filterUsers.map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => {
                      setSelectedUserFilter(user);
                      setShowUserFilterDropdown(false);
                    }}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center rounded px-3 py-2 text-left text-sm ${selectedUserFilter === user ? "bg-[#156372]/10 text-gray-800" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {user}
                  </button>
                ))}
              </div>
            )}
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
                    <div className="flex items-center gap-2 projects-select-header-actions">
                      <button
                        type="button"
                        onClick={handleOpenTimesheetColumnsModal}
                        className="border-none bg-transparent p-0 text-[#156372] cursor-pointer"
                        aria-label="Customize columns"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </div>
                    <div className="projects-select-header-checkbox mt-1">
                      <input
                        type="checkbox"
                        checked={selectedEntries.length === sortedEntries.length && sortedEntries.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEntries(sortedEntries.map((e) => e.id));
                          else setSelectedEntries([]);
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                  </th>
                  {visibleTimesheetColumns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="w-[40px] px-4 py-3 text-right">
                    <button className="border-none bg-transparent p-0 text-gray-500 cursor-pointer">
                      <Search size={16} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  return (
                    <tr key={entry.id} className="cursor-pointer border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 projects-select-cell">
                        <div className="projects-select-cell-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedEntries([...selectedEntries, entry.id]);
                              else setSelectedEntries(selectedEntries.filter((id) => id !== entry.id));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer"
                          />
                        </div>
                      </td>
                      {visibleTimesheetColumns.map((column) => {
                        const value = getTimesheetColumnValue(entry, column.key);
                        const cellClassName =
                          column.key === "project"
                            ? "px-4 py-3 text-sm text-[#156372]"
                            : column.key === "customerApprovals"
                              ? "px-4 py-3 text-sm text-[#10b981]"
                              : column.key === "billingStatus"
                                ? "px-4 py-3 text-sm text-gray-800"
                                : "px-4 py-3 text-sm text-gray-800";

                        return (
                          <td
                            key={`${entry.id}-${column.key}`}
                            className={cellClassName}
                            onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3" />
                    </tr>
                  );
                })}
                {sortedEntries.length === 0 && (
                  <tr>
                    <td colSpan={visibleTimesheetColumns.length + 2} className="px-4 py-10 text-center text-sm text-gray-500">
                      No log entries found. Click "+ New" to create your first log entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
              <button
                onClick={goToPreviousMonth}
                className="rounded-full border-none bg-transparent p-1 text-gray-500 hover:text-[#156372] cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-[18px] font-semibold text-gray-800">{getMonthLabel(calendarDate)}</div>
              <button
                onClick={goToNextMonth}
                className="rounded-full border-none bg-transparent p-1 text-gray-500 hover:text-[#156372] cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className={`flex-1 min-h-0 overflow-auto ${selectedDateForLogEntry ? "pr-[380px]" : ""}`}>
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase text-gray-500">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="px-3 py-3 text-center">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarCells.map((cell) => {
                  const key = formatCalendarKey(cell);
                  const entries = calendarEntryMap.get(key) || [];
                  const totalMinutes = monthDayTotals.get(key) || 0;
                  const totalHours = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
                  const isSelected = selectedCalendarDateKey === key;
                  const hasEntries = entries.length > 0;

                  return (
                    <div
                      key={key || cell.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedDateForLogEntry(new Date(cell));
                        setSelectedEntry(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedDateForLogEntry(new Date(cell));
                          setSelectedEntry(null);
                        }
                      }}
                      className={`group relative min-h-[150px] border-b border-r border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-[#f7fbff] ${
                        isSelected ? "ring-1 ring-inset ring-[#4a8cf7] bg-[#f2f7ff]" : ""
                      } cursor-pointer`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[13px] font-medium text-gray-800">
                          {cell.getDate()}
                        </span>
                        <span className={`opacity-0 transition-opacity group-hover:opacity-100 ${isSelected ? "opacity-100" : ""}`}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDateForLogEntry(new Date(cell));
                              setSelectedEntry(null);
                              setShowLogEntryForm(true);
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#156372] text-white hover:bg-[#0f4f5c] cursor-pointer"
                            title="Add log entry"
                          >
                            <Plus size={11} />
                          </button>
                        </span>
                      </div>

                      <div className="mt-8 space-y-1">
                        {hasEntries ? (
                          <>
                            <div className="border-l-2 border-[#d7dff1] pl-2 text-[12px] font-medium text-gray-800">
                              {totalHours}
                            </div>
                            <div className="border-l-2 border-[#d7dff1] pl-2 text-[11px] text-gray-500">
                              Total Logged Hours
                            </div>
                            <div className="pl-2 text-[11px] text-[#156372]">
                              {entries.length} Timesheets
                              <ChevronRight size={12} className="inline-block align-middle" />
                            </div>
                          </>
                        ) : (
                          <div className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <div className="border-l-2 border-[#d7dff1] pl-2 text-[12px] text-gray-500">
                              No logged hours
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDateForLogEntry && (
              <div className="absolute right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    {selectedDateForLogEntry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowLogEntryForm(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border-none bg-[#156372] text-white hover:bg-[#0f4f5c] cursor-pointer"
                      title="Add log entry"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => moveSelectedCalendarDate(-1)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                      title="Previous day"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => moveSelectedCalendarDate(1)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                      title="Next day"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => setSelectedDateForLogEntry(null)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-red-500 hover:bg-red-50 cursor-pointer"
                      title="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="border-b border-gray-200 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                      <div className="text-xs text-gray-500">Total Logged Hours</div>
                      <div className="mt-1 text-[18px] font-semibold text-gray-900">{selectedCalendarTotalLabel}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                      <div className="text-xs text-gray-500">Total Users</div>
                      <div className="mt-1 text-[18px] font-semibold text-gray-900">{selectedCalendarUniqueUsers}</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {selectedCalendarEntries.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">No entries for this date.</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {selectedCalendarEntries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-gray-50"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                            {String(getUserName(entry) || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-gray-900">
                              {toHHMM(entry)} hrs
                            </div>
                            <div className="truncate text-[12px] text-gray-500">
                              {getProjectName(entry)} â€¢ {getUserName(entry)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'list' && selectedEntry && (
        <div className="absolute right-0 top-0 h-full w-[360px] border-l border-gray-200 bg-white shadow-lg z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              {`${getUserName(selectedEntry) || "User"}'s Log Entry`}
            </div>
            <div className="flex items-center gap-2" ref={entryMenuRef}>
              <button
                onClick={() => {
                  setIsEditingEntry(true);
                  setEditedEntryData(selectedEntry);
                }}
                className="h-7 w-7 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
              >
                <Edit3 size={14} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowEntryMenu((v) => !v)}
                  className="h-7 w-7 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
                >
                <MoreVertical size={14} />
                </button>
                {showEntryMenu && (
                  <div className="absolute right-0 mt-2 w-32 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
                    <button
                      onClick={handleCloneSelectedEntry}
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                    >
                      Clone
                    </button>
                    <button
                      onClick={handleDeleteSelectedEntry}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="h-7 w-7 rounded border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-center">
              <div className="text-xs text-gray-500">
                {selectedEntry.date || "--"}
              </div>
              <div className="text-xl font-semibold text-gray-900 mt-1">
                {formatDuration(selectedEntry)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 px-4 pt-3 text-sm">
            <button
              onClick={() => setActiveTab('otherDetails')}
              className={`pb-2 border-b-2 ${activeTab === 'otherDetails' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'}`}
            >
              Other Details
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-2 border-b-2 ${activeTab === 'comments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'}`}
            >
              Comments
            </button>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3">
            {activeTab === 'otherDetails' && (
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between"><span className="text-gray-500">Project Name :</span><span>{getProjectName(selectedEntry)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer Name :</span><span>{getCustomerName(selectedEntry)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Task Name :</span><span>{selectedEntry.taskName || "--"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">User Name :</span><span>{getUserName(selectedEntry)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Cost :</span><span>$0.00</span></div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-2">
                    <button
                      onClick={() => setIsBold((v) => !v)}
                      className={`h-7 w-7 rounded border ${isBold ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600'} text-xs font-semibold`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => setIsItalic((v) => !v)}
                      className={`h-7 w-7 rounded border ${isItalic ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600'} text-xs italic`}
                    >
                      I
                    </button>
                    <button
                      onClick={() => setIsUnderline((v) => !v)}
                      className={`h-7 w-7 rounded border ${isUnderline ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600'} text-xs underline`}
                    >
                      U
                    </button>
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full resize-none border-none px-3 py-2 text-sm focus:outline-none"
                    rows={3}
                    placeholder="Add a comment"
                    style={{
                      fontWeight: isBold ? "600" : "400",
                      fontStyle: isItalic ? "italic" : "normal",
                      textDecoration: isUnderline ? "underline" : "none",
                    }}
                  />
                  <div className="flex justify-start border-t border-gray-200 px-2 py-2">
                    <button
                      onClick={handleAddComment}
                      className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="text-[11px] font-semibold text-gray-500">ALL COMMENTS</div>
                  <div className="mt-2 space-y-2">
                    {comments.length === 0 && (
                      <div className="text-xs text-gray-500">No comments yet.</div>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        <div>{c.text}</div>
                        <div className="mt-1 text-[10px] text-gray-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTimesheetColumnsModal && (
        <div
          className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16"
          onClick={handleCloseTimesheetColumnsModal}
        >
          <div
            className="w-full max-w-[450px] rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-2 text-[15px] font-medium text-slate-800">
                <SlidersHorizontal size={14} className="text-slate-500" />
                <span>Customize Columns</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-500">
                  {new Set([
                    ...draftTimesheetColumns,
                    ...timesheetColumnOptions.filter((column) => column.locked).map((column) => column.key),
                  ]).size} of {timesheetColumnOptions.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handleCloseTimesheetColumnsModal}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={timesheetColumnsSearchTerm}
                  onChange={(event) => setTimesheetColumnsSearchTerm(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                />
              </div>

              <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
                {filteredTimesheetColumnOptions.map((column) => {
                  const checked = column.locked || draftTimesheetColumns.includes(column.key);
                  return (
                    <label
                      key={column.key}
                      className="mb-2 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      <span className="flex h-4 w-4 items-center justify-center text-slate-400">â‹®â‹®</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={column.locked}
                        onChange={() => handleToggleTimesheetColumn(column.key)}
                        className="h-4 w-4 cursor-pointer accent-[#156372] disabled:cursor-not-allowed disabled:accent-slate-400"
                      />
                      <span className={column.locked ? "text-slate-400" : "text-slate-700"}>{column.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={handleSaveTimesheetColumns}
                className="rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4f5c]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCloseTimesheetColumnsModal}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                {getDeleteConfirmTitle()}
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              {getDeleteConfirmMessage()}
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setShowDeleteConfirm(false)}
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
          defaultDate={selectedDateForLogEntry}
        />
      )}

      <StartTimerModal
        open={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        elapsedTime={elapsedTime}
        defaultProjectName={associatedProject || selectedProjectForTimer}
        defaultTaskName={selectedTaskForTimer}
      />

      {isEditingEntry && selectedEntry && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditingEntry(false);
            }
          }}
        >
          <EditLogEntryModal
            entry={selectedEntry}
            projects={projects}
            users={systemUsers.length > 0 ? systemUsers : users}
            userById={userById}
            onClose={() => setIsEditingEntry(false)}
            onSaved={() => {
              setIsEditingEntry(false);
              window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
            }}
            toHHMM={toHHMM}
          />
        </div>
      )}
    </div>
  );
}

function EditLogEntryModal({ entry, projects, users, userById, onClose, onSaved, toHHMM }) {
  const resolveProjectName = () => {
    const byId = entry?.projectId
      ? projects.find((p) => p.id === entry.projectId || p._id === entry.projectId)
      : null;
    if (byId?.projectName) return byId.projectName;
    const byNumber = entry?.projectNumber
      ? projects.find((p) => p.projectNumber === entry.projectNumber)
      : null;
    if (byNumber?.projectName) return byNumber.projectName;
    return entry?.projectName || '';
  };

  const resolveUserId = () => {
    if (entry?.userId) return entry.userId;
    if (entry?.user && userById?.get && userById.get(String(entry.user))) {
      return entry.user;
    }
    if (entry?.userName) {
      const match = users.find((u) => (u?.name || u?.fullName || u?.username || u?.email) === entry.userName);
      return match?._id || match?.id || '';
    }
    if (entry?.user) {
      const match = users.find((u) => (u?.name || u?.fullName || u?.username || u?.email) === entry.user);
      return match?._id || match?.id || '';
    }
    return '';
  };

  const [form, setForm] = useState({
    date: entry?.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    projectName: resolveProjectName(),
    taskName: entry?.taskName || entry?.task || '',
    timeSpent: toHHMM(entry),
    userId: resolveUserId(),
    notes: entry?.notes || entry?.description || '',
    billable: entry?.billable !== undefined ? entry.billable : true,
  });

  const selectedProject = projects.find((p) => p.projectName === form.projectName);
  const tasks = selectedProject?.tasks || [];
  const costPerHour = Number(selectedProject?.billingRate || 0);
  const currencyCode = String(selectedProject?.currency || "USD").substring(0, 3).toUpperCase();
  const [h, m] = String(form.timeSpent || "00:00").split(":").map((v) => Number(v) || 0);
  const totalCost = (h + m / 60) * costPerHour;

  return (
    <div className="w-full max-w-[600px] overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-200 px-6 pt-6 pb-2">
        <div>
          <h2 className="m-0 mb-1 text-xl font-semibold text-gray-900">Edit Log Entry</h2>
          <p className="m-0 text-xs text-gray-500">Log time instantly using shortcut keys c + t</p>
        </div>
        <button onClick={onClose} className="border-none bg-transparent p-1 text-gray-900 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[#ef4444]">
            Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[#ef4444]">
            Project Name<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value, taskName: '' })}
              className="w-full appearance-none rounded-md border border-blue-500 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id || project._id} value={project.projectName}>
                  {project.projectName}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <ChevronDown size={14} />
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[#ef4444]">
            Task Name<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={form.taskName}
              onChange={(e) => setForm({ ...form, taskName: e.target.value })}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-blue-500"
              disabled={!form.projectName}
            >
              <option value="">{form.projectName ? "Select task" : "Select project first"}</option>
              {tasks.map((task, idx) => {
                const name = task.taskName || task.name || `Task ${idx + 1}`;
                return (
                  <option key={`${name}-${idx}`} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <ChevronDown size={14} />
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[#ef4444]">
            Time Spent<span className="text-red-500">*</span>
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-xs text-gray-500">?</div>
          </label>
          <input
            type="text"
            value={form.timeSpent}
            onChange={(e) => setForm({ ...form, timeSpent: e.target.value })}
            placeholder="HH:MM"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-[#ef4444]">
            User<span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select user</option>
              {users.map((u, idx) => {
                const id = u?._id || u?.id || u?.userId || String(idx);
                const name = u?.name || u?.fullName || u?.username || u?.email || 'User';
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <ChevronDown size={14} />
            </span>
          </div>
        </div>

        <div className="mb-5 text-sm text-gray-800">
          <div className="font-medium text-gray-700">Total Cost</div>
          <div className="mt-1 text-gray-700">
            {currencyCode} {totalCost.toFixed(2)} for {form.timeSpent || "00:00"} hours (Cost Per Hour: {currencyCode} {costPerHour.toFixed(2)})
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add notes"
            rows={4}
            className="w-full resize-y rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={async () => {
              if (!form.date || !form.projectName || !form.taskName || !form.timeSpent) {
                toast.error("Please fill in all required fields");
                return;
              }
              const projectObj = projects.find((p) => p.projectName === form.projectName);
              const [hours, minutes] = String(form.timeSpent).split(":").map(Number);
              const payload = {
                project: projectObj?.id || projectObj?._id || entry.projectId,
                user: form.userId || entry.userId || entry.user,
                date: new Date(form.date).toISOString(),
                hours: hours || 0,
                minutes: minutes || 0,
                description: form.notes || '',
                billable: form.billable,
                task: form.taskName || '',
              };
              try {
                await timeEntriesAPI.update(entry.id, payload);
                toast.success("Time entry updated successfully!");
                onSaved();
              } catch (error) {
                toast.error("Failed to update time entry");
              }
            }}
            className="cursor-pointer rounded-md border-none px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "#2563eb" }}
          >
            Save
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimeTrackingPage() {
  const {
    loading: permissionsLoading,
    canView,
    canCreate,
    canEdit,
  } = usePermissions() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const canViewTimeTracking = typeof canView === "function" ? canView("timesheets", "projects") : true;
  const canCreateTimeTracking = typeof canCreate === "function" ? canCreate("timesheets", "projects") : true;
  const canEditTimeTracking = typeof canEdit === "function" ? canEdit("timesheets", "projects") : true;
  const isProjectsActive = location.pathname.startsWith("/time-tracking/projects") || location.pathname.startsWith("/time-tracking/tasks");
  const isTimesheetsActive = !isProjectsActive;

  if (permissionsLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  if (!canViewTimeTracking) {
    return (
      <AccessDenied
        title="Time Tracking access required"
        message="Your role does not include Time Tracking permissions."
      />
    );
  }

  return (
    <div className="page flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigate("/time-tracking/projects")}
            className={`relative border-none bg-transparent px-1.5 py-4 text-sm font-semibold uppercase tracking-wide ${
              isProjectsActive ? "text-[#156372]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Projects
            {isProjectsActive && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#156372]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/time-tracking/timesheet")}
            className={`relative border-none bg-transparent px-1.5 py-4 text-sm font-semibold uppercase tracking-wide ${
              isTimesheetsActive ? "text-[#156372]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Timesheets
            {isTimesheetsActive && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#156372]" />
            )}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Routes>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<TimeTrackingProject />} />
          <Route path="projects/new" element={canCreateTimeTracking ? <NewProjectForm /> : <AccessDenied />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/edit" element={canEditTimeTracking ? <EditProjectForm /> : <AccessDenied />} />
          <Route path="projects/import" element={canCreateTimeTracking ? <ImportProjects /> : <AccessDenied />} />
          <Route path="projects/import-tasks" element={canCreateTimeTracking ? <ImportProjectTasks /> : <AccessDenied />} />
          <Route path="tasks" element={<ProjectsPage />} />
          <Route path="timesheet" element={<TimesheetTable />} />
          <Route path="timesheet/entries" element={<TimeEntriesPage />} />
          <Route path="timesheet/weekly" element={<WeeklyTimeLog />} />
          <Route path="timesheet/import" element={canCreateTimeTracking ? <ImportTimesheets /> : <AccessDenied />} />
          <Route path="approvals" element={<Aptouvals />} />
          <Route path="customer-approvals" element={<CustomerApproval />} />
          <Route path="customer-approvals/new" element={<NewCustomerApproval />} />
          <Route path="*" element={<Navigate to="projects" replace />} />
        </Routes>
      </div>
    </div>
  );
}
