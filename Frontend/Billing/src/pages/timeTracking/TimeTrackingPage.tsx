import React, { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronRight, Download, Upload, Settings, RefreshCw, Edit3, Eye, EyeOff, Info, ChevronDown, Play, Pause, Square, Trash2, Plus, MoreVertical, MoreHorizontal, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { projectsAPI, timeEntriesAPI } from "../../services/api";
import toast from "react-hot-toast";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";
import ProjectsPage from "../home/pages/ProjectsPage";
import NewProjectForm from "./NewProjectForm";
import ProjectDetailPage from "./ProjectDetailPage";
import EditProjectForm from "./EditProjectForm";
import NewLogEntryForm from "./NewLogEntryForm";
import WeeklyTimeLog from "./WeeklyTimeLog";
import ImportProjects from "./ImportProjects";
import ImportTimesheets from "./ImportTimesheets";
import ImportProjectTasks from "./ImportProjectTasks";
import TimeTrackingProject from "./TimeTrackingProject";
import Aptouvals from "./aprovals/aptouvals";
import CustomerApproval from "./CustomerApproval/CustomerApproval";
import NewCustomerApproval from "./CustomerApproval/NewCustomerApproval";



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

        const transformedEntries = data.map(entry => {
          // Extract user name as string (handle both object and string cases)
          const userName = typeof entry.user === 'object' && entry.user !== null
            ? (entry.user.name || entry.userName || '--')
            : (entry.userName || entry.user || '--');

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
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.user || '--'}</td>
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
  const [hoveredMenu, setHoveredMenu] = useState(null); // 'sort', 'import', 'export', 'preferences'
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [openDropdownEntryId, setOpenDropdownEntryId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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
  const [selectedView, setSelectedView] = useState('All');
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [criteria, setCriteria] = useState([{ id: 1, field: '', comparator: '', value: '' }]);
  const [selectedColumns, setSelectedColumns] = useState(['Project']);
  const [visibility, setVisibility] = useState('only-me');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('otherDetails'); // 'otherDetails' or 'comments'
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [editedEntryData, setEditedEntryData] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date()); // Current month/year for calendar
  const [selectedDateForLogEntry, setSelectedDateForLogEntry] = useState(null); // Selected date for new log entry
  const [selectedEntries, setSelectedEntries] = useState([]); // Selected time entries for bulk actions
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const periodDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const newLogEntryDropdownRef = useRef(null);

  const timesheetViews = [
    { id: 'All', label: 'All' },
    { id: 'Invoiced', label: 'Invoiced' },
    { id: 'Unbilled', label: 'Unbilled' }
  ];
  const availableColumns = ['Date', 'Customer', 'Task', 'User', 'Time', 'Billing Status'];

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

  // Get projects from localStorage for dropdown
  const [projects, setProjects] = useState([]);

  // Load time entries from database (declare before useMemo that uses it)
  const [timeEntries, setTimeEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

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

  // Extract unique users from all projects and time entries
  const users = useMemo(() => {
    const userMap = new Map();

    // Add users from projects
    projects.forEach(project => {
      if (project.users && Array.isArray(project.users)) {
        project.users.forEach(user => {
          if (user.name && !userMap.has(user.name)) {
            userMap.set(user.name, { id: user.id || Date.now() + Math.random(), name: user.name, email: user.email || '' });
          }
        });
      }
    });

    // Add users from time entries
    timeEntries.forEach(entry => {
      const userName = entry.userName || entry.user || '';
      if (userName && userName !== '--' && !userMap.has(userName)) {
        userMap.set(userName, {
          id: entry.userId || Date.now() + Math.random(),
          name: userName,
          email: ''
        });
      }
    });

    return Array.from(userMap.values());
  }, [projects, timeEntries]);

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

  // Get tasks from selected project
  const selectedProject = projects.find(p => p.projectName === logEntryData.projectName);
  const availableTasks = selectedProject?.tasks || [];

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

        // Transform database entries to match frontend format
        const transformedEntries = data.map(entry => {
          // Extract user name as string (handle both object and string cases)
          const userName = typeof entry.user === 'object' && entry.user !== null
            ? (entry.user.name || '--')
            : (entry.userName || entry.user || '--');

          return {
            id: entry._id || entry.id,
            projectId: entry.project?._id || entry.projectId,
            projectName: entry.project?.name || entry.projectName,
            projectNumber: entry.project?.projectNumber || entry.projectNumber,
            userId: entry.user?._id || entry.userId,
            userName: userName,
            user: userName, // Ensure user is always a string
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
      // Close row dropdown when clicking outside (will be handled by checking if click target is inside dropdown)
      if (openDropdownEntryId) {
        const dropdownElement = document.querySelector(`[data-dropdown-entry-id="${openDropdownEntryId}"]`);
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setOpenDropdownEntryId(null);
        }
      }
    }

    if (showDropdown || showMoreMenu || showMoreDropdown || showNewLogEntryDropdown || openDropdownEntryId || sortSubmenuOpen || importSubmenuOpen || exportSubmenuOpen || preferencesSubmenuOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showMoreMenu, showMoreDropdown, showNewLogEntryDropdown, openDropdownEntryId, sortSubmenuOpen, importSubmenuOpen, exportSubmenuOpen, preferencesSubmenuOpen]);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      setElapsedTime(timerState.elapsedTime || 0);
      setIsTimerRunning(timerState.isTimerRunning || false);
      setTimerNotes(timerState.timerNotes || '');
      setAssociatedProject(timerState.associatedProject || '');
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const timerState = {
      elapsedTime,
      isTimerRunning,
      timerNotes,
      associatedProject,
      lastUpdated: Date.now()
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
  }, [elapsedTime, isTimerRunning, timerNotes, associatedProject]);

  // Listen for storage changes (when timer is updated from other page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'timerState' && e.newValue) {
        const timerState = JSON.parse(e.newValue);
        setElapsedTime(timerState.elapsedTime || 0);
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        setElapsedTime(timerState.elapsedTime || 0);
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timerStateUpdated', handleCustomStorage);

    // Poll for changes (for same-tab updates)
    const pollInterval = setInterval(() => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        if (timerState.lastUpdated && timerState.lastUpdated > (Date.now() - 2000)) {
          setElapsedTime(timerState.elapsedTime || 0);
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
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Update localStorage on each tick
          const timerState = {
            elapsedTime: newTime,
            isTimerRunning: true,
            timerNotes,
            associatedProject,
            lastUpdated: Date.now()
          };
          localStorage.setItem('timerState', JSON.stringify(timerState));
          window.dispatchEvent(new CustomEvent('timerStateUpdated'));
          return newTime;
        });
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
  }, [isTimerRunning, timerNotes, associatedProject]);

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

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
    const timerState = {
      elapsedTime,
      isTimerRunning: false,
      timerNotes,
      associatedProject,
      lastUpdated: Date.now()
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleStopTimer = async () => {
    setIsTimerRunning(false);
    // Save the time entry
    if (elapsedTime > 0 && associatedProject) {
      try {
        // Find project
        const projectObj = projects.find(p => p.projectName === associatedProject);
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
        const timeStr = formatTimeShort(elapsedTime);
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
          billable: true,
          task: '',
        };

        await timeEntriesAPI.create(newEntry);

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

        // Show success message
        toast.success('Time entry saved successfully!');
      } catch (error) {
        console.error("Error saving timer entry:", error);
        toast.error("Failed to save time entry");
      }
    }
    // Reset timer
    setElapsedTime(0);
    setTimerNotes('');
    setAssociatedProject('');
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
          aValue = (a.user || "").toLowerCase();
          bValue = (b.user || "").toLowerCase();
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

  // Filter entries based on selected filters
  const getFilteredEntries = (entries) => {
    let filtered = [...entries];
    if (selectedView === 'Invoiced') {
      filtered = filtered.filter(e => e.billingStatus === 'Invoiced');
    } else if (selectedView === 'Unbilled') {
      filtered = filtered.filter(e => e.billingStatus === 'Unbilled' || !e.billingStatus);
    }
    return filtered;
  };

  // Get sorted entries (memoized)
  const sortedEntries = useMemo(() => {
    const filtered = getFilteredEntries(timeEntries);
    return getSortedEntries(filtered);
  }, [timeEntries, selectedSort, sortDirection, selectedView]);

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
          `"${(entry.user || "").replace(/"/g, '""')}"`,
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
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 border-none bg-transparent p-0 text-[32px] font-semibold text-gray-800 hover:text-gray-900 cursor-pointer"
            >
              All Timesheets
              <ChevronDown size={14} className="text-[#156372]" />
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
                  onClick={isTimerRunning ? handlePauseTimer : handleStartTimer}
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
                className="flex h-9 items-center gap-1.5 rounded-l-md border-none bg-[#408dfb] px-3.5 text-sm font-semibold text-white hover:bg-[#307deb] cursor-pointer"
              >
                <Plus size={15} />
                New Log Entry
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
                if (!window.confirm("Are you sure you want to delete selected entries?")) return;
                try {
                  await Promise.all(selectedEntries.map(entryId => timeEntriesAPI.delete(entryId)));
                  const response = await timeEntriesAPI.getAll();
                  setTimeEntries(Array.isArray(response) ? response : (response?.data || []));
                  setSelectedEntries([]);
                  toast.success(`Successfully deleted entries.`);
                } catch (e) { toast.error("Failed to delete entries"); }
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

      <div className="flex-1 overflow-hidden bg-white flex flex-col">
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-auto border-t border-gray-200 bg-white">
            <table className="w-full border-collapse bg-white">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-[60px] px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 projects-select-header">
                    <div className="flex items-center gap-2 projects-select-header-actions">
                      <button className="border-none bg-transparent p-0 text-[#156372] cursor-pointer">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">DATE</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">PROJECT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">CUSTOMER</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">TASK</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">USER</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">TIME</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">BILLING STATUS</th>
                  <th className="w-[40px] px-4 py-3 text-right">
                    <button className="border-none bg-transparent p-0 text-gray-500 cursor-pointer">
                      <Search size={16} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const project = projects?.find((p) => p.projectName === entry.projectName);
                  const customerName = project?.customerName || '--';
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
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.date}</td>
                      <td className="px-4 py-3 text-sm text-[#156372]" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.projectName || '--'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.taskName}</td>
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.user}</td>
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.timeSpent}</td>
                      <td className="px-4 py-3 text-sm text-gray-800" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>{entry.billingStatus || 'Unbilled'}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  );
                })}
                {sortedEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      No log entries found. Click "+ New" to create your first log entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 p-6">
            {sortedEntries.map((entry) => {
              const project = projects?.find((p) => p.projectName === entry.projectName);
              const customerName = project?.customerName || '--';
              return (
                <div key={entry.id} className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 hover:shadow" onClick={() => typeof setSelectedEntry === 'function' && setSelectedEntry(entry)}>
                  <div className="mb-2 text-lg font-semibold text-[#156372]">{entry.projectName || 'Unassigned'}</div>
                  <div className="text-sm text-gray-600 mb-1">Time: {entry.timeSpent}</div>
                  <div className="text-sm text-gray-600 mb-1">User: {entry.user}</div>
                  <div className="text-sm text-gray-600">Status: {entry.billingStatus || 'Unbilled'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLogEntryForm && <NewLogEntryForm onClose={() => setShowLogEntryForm(false)} />}
    </div>
  );
}

export default function TimeTrackingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    loading: permissionsLoading,
    canView,
    canCreate,
    canEdit,
  } = usePermissions() as any;

  const canViewTimeTracking = typeof canView === "function" ? canView("timesheets", "projects") : true;
  const canCreateTimeTracking = typeof canCreate === "function" ? canCreate("timesheets", "projects") : true;
  const canEditTimeTracking = typeof canEdit === "function" ? canEdit("timesheets", "projects") : true;

  useEffect(() => {
    const message = location.state?.toast;
    if (message) {
      toast.success(message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

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
    <div className="page">
      <Routes>
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
        <Route
          path="*"
          element={<ProjectsPage />}
        />
      </Routes>
    </div>
  );
}

