import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown, Clock, Search } from "lucide-react";
import api, { projectsAPI, usersAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import useCurrency from "../../hooks/useCurrency";
import { toast } from "react-toastify";

const timeEntriesAPI = (api as any).timeEntriesAPI;

export default function NewLogEntryForm({
  onClose,
  formTitle = "New Log Entry",
  entryId = "",
  defaultProjectName = "",
  defaultDate = null,
  defaultTaskName = "",
  defaultBillable = undefined,
  defaultTimeSpent = "",
  defaultUser = "",
  defaultNotes = "",
  onStartTimer = undefined,
}) {
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
  const [useStartEndTime, setUseStartEndTime] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [newTaskRatePerHour, setNewTaskRatePerHour] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const projectDropdownRef = useRef(null);
  const taskDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const currentUserInfo = getCurrentUser();
  const currentUserLabel =
    currentUserInfo?.name ||
    currentUserInfo?.username ||
    currentUserInfo?.fullName ||
    currentUserInfo?.displayName ||
    currentUserInfo?.email ||
    "";
  const [users, setUsers] = useState([]);
  // Helper function to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') {
      const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const first = Number(slashMatch[1]);
        const second = Number(slashMatch[2]);
        const year = slashMatch[3];
        const day = first > 12 ? first : second;
        const month = first > 12 ? second : first;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      // Try to parse if it's already in a date format
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      // If it's in "08 Jan 2026" format, parse it
      const dateMatch = date.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const monthMap = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const monthNum = monthMap[month] || '01';
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  const [logEntryData, setLogEntryData] = useState({
    date: formatDateForInput(defaultDate),
    projectName: defaultProjectName,
    taskName: defaultTaskName,
    timeSpent: defaultTimeSpent,
    startTime: '',
    endTime: '',
    billable: defaultBillable !== undefined ? defaultBillable : true,
    user: defaultUser || currentUserLabel,
    notes: defaultNotes
  });
  // Get projects from backend
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await projectsAPI.getAll();
        const data = Array.isArray(response) ? response : (response?.data || []);
        setProjects(data.map(p => ({
          id: p._id || p.id,
          projectName: p.name || p.projectName,
          projectNumber: p.projectNumber || p.projectCode || p.code || p.number || '',
          billingMethod: p.billingMethod || p.billingType || '',
          tasks: p.tasks || [],
          billingRate: p.billingRate || 0,
          currency: p.currency || "USD"
        })));
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getAll({ limit: 1000 });
        const data = Array.isArray(response) ? response : (response?.data || []);
        const activeUsers = data.filter((user) => {
          const status = String(user?.status || user?.userStatus || "").toLowerCase();
          if (status) return status === "active" || status === "enabled";
          if (typeof user?.isActive === "boolean") return user.isActive;
          if (typeof user?.active === "boolean") return user.active;
          return true;
        });
        setUsers(activeUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Get tasks from selected project
  const selectedProject = projects.find(p => p.projectName === logEntryData.projectName);
  const availableTasks = selectedProject?.tasks || [];
  const showTaskRatePerHour = (() => {
    const method = String(selectedProject?.billingMethod || "").trim().toLowerCase();
    return method === "task-hours" || method === "based on task hours";
  })();
  const getUserDisplayName = (user) =>
    user?.name || user?.fullName || user?.username || user?.email || "Untitled User";
  const selectedUserRecord = users.find((user) => getUserDisplayName(user) === logEntryData.user);
  const filteredUsers = users
    .map((user) => getUserDisplayName(user))
    .filter((user) => user.toLowerCase().includes(userSearchTerm.toLowerCase()));

  const getProjectCode = (project) =>
    project?.projectNumber || project?.code || project?.projectCode || project?.projectCodeNumber || '';

  const filteredProjects = projects.filter((project) => {
    const projectName = (project.projectName || 'Untitled Project').toLowerCase();
    const projectCode = String(getProjectCode(project)).toLowerCase();
    const query = projectSearchTerm.toLowerCase();
    return projectName.includes(query) || projectCode.includes(query);
  });

  // Filter tasks based on search term
  const filteredTasks = availableTasks.filter(task => {
    const taskName = task.taskName || 'Untitled Task';
    return taskName.toLowerCase().includes(taskSearchTerm.toLowerCase());
  });
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
        setProjectSearchTerm('');
      }
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target)) {
        setShowTaskDropdown(false);
        setTaskSearchTerm('');
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
        setUserSearchTerm('');
      }
    };

    if (showTaskDropdown || showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDropdown, showUserDropdown]);

  // Calculate duration from start and end time
  const calculateDuration = (start, end) => {
    if (!start || !end) return '';

    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes < 0) return '';

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const parseDurationInput = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return null;

    const cleaned = value.replace(/\s+/g, "");

    if (cleaned.includes(":")) {
      const [hoursPart = "", minutesPart = ""] = cleaned.split(":");
      const hours = hoursPart === "" ? 0 : Number(hoursPart);
      const minutes = minutesPart === "" ? 0 : Number(minutesPart);

      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
      if (minutes < 0 || minutes >= 60) return null;

      return { hours, minutes, formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` };
    }

    if (cleaned.includes(".")) {
      const [hoursPart = "", fractionPart = ""] = cleaned.split(".");
      const hours = hoursPart === "" ? 0 : Number(hoursPart);
      const fraction = fractionPart === "" ? 0 : Number(`0.${fractionPart}`);

      if (!Number.isFinite(hours) || !Number.isFinite(fraction)) return null;
      const totalMinutes = Math.round(fraction * 60);
      const normalizedHours = hours + Math.floor(totalMinutes / 60);
      const normalizedMinutes = totalMinutes % 60;

      return {
        hours: normalizedHours,
        minutes: normalizedMinutes,
        formatted: `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`,
      };
    }

    const hours = Number(cleaned);
    if (!Number.isFinite(hours)) return null;

    return { hours, minutes: 0, formatted: `${String(hours).padStart(2, "0")}:00` };
  };

  const normalizeDurationInput = (rawValue) => {
    const parsed = parseDurationInput(rawValue);
    return rawValue ? String(rawValue).replace(/[^\d:.]/g, "") : "";
  };

  const formatDurationOnBlur = (rawValue) => {
    const parsed = parseDurationInput(rawValue);
    return parsed ? parsed.formatted : "";
  };

  const normalizeTimeInput = (rawValue) => {
    const value = String(rawValue || "").replace(/[^\d:]/g, "");
    if (!value) return "";

    return value;
  };

  const formatTimeOnBlur = (rawValue) => {
    const value = String(rawValue || "").replace(/[^\d:]/g, "");
    if (!value) return "";

    if (!value.includes(":")) {
      const hoursOnly = Number(value);
      if (!Number.isFinite(hoursOnly)) return "";
      if (hoursOnly > 23) return "00:00";
      return `${String(hoursOnly).padStart(2, '0')}:00`;
    }

    const [hoursPart, minutesPart] = value.split(":");
    const hours = Number(hoursPart);
    const minutes = minutesPart === undefined ? null : Number(minutesPart);

    if (Number.isFinite(hours) && hours > 23) return "00:00";
    if (minutes !== null && Number.isFinite(minutes) && minutes > 59) return "00:00";

    if (Number.isFinite(hours) && minutes === null) {
      return `${String(hours).padStart(2, '0')}:00`;
    }

    return value;
  };

  // Update timeSpent when start/end time changes
  useEffect(() => {
    if (useStartEndTime && logEntryData.startTime && logEntryData.endTime) {
      const duration = calculateDuration(logEntryData.startTime, logEntryData.endTime);
      if (duration) {
        setLogEntryData(prev => ({ ...prev, timeSpent: duration }));
      }
    }
  }, [logEntryData.startTime, logEntryData.endTime, useStartEndTime]);

  const resolvedTimeSpent = (() => {
    if (useStartEndTime && logEntryData.startTime && logEntryData.endTime) {
      const duration = calculateDuration(logEntryData.startTime, logEntryData.endTime);
      return duration || logEntryData.timeSpent;
    }
    return logEntryData.timeSpent;
  })();

  const resolvedDuration = parseDurationInput(resolvedTimeSpent);
  const displayTimeSpent = resolvedDuration?.formatted || "00:00";
  const [spentHours, spentMinutes] = [
    resolvedDuration?.hours ?? 0,
    resolvedDuration?.minutes ?? 0,
  ];
  const totalHours = spentHours + spentMinutes / 60;
  const costPerHour = Number(selectedProject?.billingRate || 0);
  const totalCost = totalHours * costPerHour;
  const baseCurrencyCode = baseCurrency?.code || "USD";

  const handleStartTimer = () => {
    const projectName = logEntryData.projectName || defaultProjectName;
    const timerState = {
      isTimerRunning: true,
      startTime: Date.now(),
      elapsedTime: 0,
      pausedElapsedTime: 0,
      timerNotes: logEntryData.notes || "",
      associatedProject: projectName,
      selectedProjectForTimer: projectName,
      selectedTaskForTimer: logEntryData.taskName || "",
      isBillable: logEntryData.billable !== undefined ? logEntryData.billable : true,
    };
    try {
      localStorage.setItem("timerState", JSON.stringify(timerState));
      window.dispatchEvent(new CustomEvent("timerStateUpdated"));
      toast.success("Timer started.");
    } catch {
      // ignore storage errors
    }
    if (typeof onStartTimer === "function") {
      onStartTimer(timerState);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[2000] p-4 pt-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-[440px] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start px-4 pt-4 pb-2 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">
              {formTitle}
            </h2>
            <p className="text-[11px] text-gray-500 m-0">
              Log time instantly using shortcut keys c + t
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-gray-900 p-1 leading-none hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex flex-col gap-3 p-4">
          {/* Date Field */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ef4444]">
              Date<span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={logEntryData.date}
              onChange={(e) => setLogEntryData({ ...logEntryData, date: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Project Name Field */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ef4444]">
              Project Name<span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={projectDropdownRef}>
              <input
                type="text"
                value={logEntryData.projectName}
                readOnly
                onClick={() => {
                  setShowProjectDropdown((open) => !open);
                  setProjectSearchTerm('');
                }}
                placeholder="Select a project"
                className="w-full px-3 py-2.5 pr-9 border border-blue-500 rounded-md text-sm outline-none cursor-pointer bg-white text-gray-900 focus:border-blue-500"
              />
              <span
                className="absolute right-3 top-[54%] -translate-y-1/2 pointer-events-none text-gray-500"
                style={{ transform: showProjectDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <ChevronDown size={14} />
              </span>
              {showProjectDropdown && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
                  <div className="border-b border-gray-200 p-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-3 text-sm outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[180px] overflow-auto py-1">
                    {filteredProjects.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No projects found</div>
                    ) : (
                      filteredProjects.map((project) => {
                        const projectName = project.projectName || 'Untitled Project';
                        const projectCode = getProjectCode(project);
                        const isActive = logEntryData.projectName === projectName;
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => {
                              setLogEntryData({
                                ...logEntryData,
                                projectName,
                                taskName: '' // Reset task when project changes
                              });
                              setShowProjectDropdown(false);
                              setProjectSearchTerm('');
                            }}
                            className={`mx-2 flex w-[calc(100%-16px)] items-center justify-between rounded px-3 py-2 text-left text-sm ${
                              isActive ? 'text-gray-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">
                              {projectName}
                            </span>
                            {isActive && <span className="ml-3 font-semibold">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Task Name Field */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-[#ef4444]">
                Task Name<span className="text-red-500">*</span>
              </label>
              {isCreatingNewTask && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewTask(false);
                    setShowTaskDropdown(false);
                    setNewTaskRatePerHour('');
                  }}
                  className="border-none bg-transparent p-0 text-sm text-[#2563eb]"
                >
                  Select from list
                </button>
              )}
            </div>
            <div className="relative" ref={taskDropdownRef}>
              {isCreatingNewTask ? (
                <div className="w-[70%] rounded-md bg-gray-50 p-2">
                  <input
                    type="text"
                    value={logEntryData.taskName}
                    onChange={(e) => setLogEntryData({ ...logEntryData, taskName: e.target.value })}
                    placeholder="Enter task name"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#156372]"
                    autoFocus
                  />
                  {showTaskRatePerHour && (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Rate Per Hour ({baseCurrencyCode})
                      </label>
                      <input
                        type="text"
                        value={newTaskRatePerHour}
                        onChange={(e) => setNewTaskRatePerHour(e.target.value)}
                        className="w-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372]"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={logEntryData.taskName}
                    readOnly
                    onClick={() => {
                      if (logEntryData.projectName) {
                        setShowTaskDropdown((open) => !open);
                        setTaskSearchTerm('');
                      }
                    }}
                    disabled={!logEntryData.projectName}
                    placeholder="Select task"
                    className={`w-full px-3 py-2.5 pr-9 border rounded-md text-sm outline-none ${logEntryData.projectName
                        ? 'border-blue-500 cursor-pointer bg-white text-gray-900 focus:border-blue-500'
                        : 'border-gray-300 cursor-not-allowed bg-gray-50 text-gray-400'
                      }`}
                  />
                  <span
                  className="absolute right-3 top-[54%] -translate-y-1/2 pointer-events-none text-gray-500"
                    style={{ transform: showTaskDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <ChevronDown size={14} />
                  </span>
                  {showTaskDropdown && logEntryData.projectName && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
                      <div className="border-b border-gray-200 p-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={taskSearchTerm}
                            onChange={(e) => setTaskSearchTerm(e.target.value)}
                            placeholder="Search"
                            className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8b5cf6]" />
                        </div>
                      </div>
                      <div className="max-h-[180px] overflow-auto py-1">
                        {filteredTasks.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No tasks found</div>
                        ) : (
                          filteredTasks.map((task, index) => {
                            const taskName = task.taskName || 'Untitled Task';
                            return (
                              <button
                                type="button"
                                key={index}
                                onClick={() => {
                                  setLogEntryData({ ...logEntryData, taskName });
                                  setShowTaskDropdown(false);
                                  setTaskSearchTerm('');
                                }}
                                className={`mx-2 flex w-[calc(100%-16px)] items-center justify-between rounded px-3 py-2 text-left text-sm ${logEntryData.taskName === taskName ? 'text-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                              >
                                <span className="truncate">{taskName}</span>
                                {logEntryData.taskName === taskName && <span className="ml-3 font-semibold">✓</span>}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <button
                          onClick={() => {
                            setIsCreatingNewTask(true);
                            setShowTaskDropdown(false);
                            setLogEntryData({ ...logEntryData, taskName: '' });
                            setNewTaskRatePerHour('');
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-blue-500 hover:bg-blue-50"
                        >
                          <span className="mr-2 text-blue-500">+</span>
                          New Task
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Time Spent Field */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#ef4444]">
              Time Spent<span className="text-red-500">*</span>
              <div className="w-[18px] h-[18px] rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 cursor-help">?</div>
            </label>
            {!useStartEndTime ? (
              <>
                <input
                  type="text"
                  value={logEntryData.timeSpent}
                  onChange={(e) => setLogEntryData({ ...logEntryData, timeSpent: normalizeDurationInput(e.target.value) })}
                  onBlur={(e) => setLogEntryData({ ...logEntryData, timeSpent: formatDurationOnBlur(e.target.value) })}
                  placeholder="HH:MM"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none mb-2 focus:border-blue-500"
                />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setUseStartEndTime(true);
                  }}
                  className="text-sm text-blue-500 no-underline flex items-center gap-1.5 hover:text-blue-600"
                >
                  <Clock size={14} className="text-blue-500" />
                  <span>Set start and end time instead</span>
                </a>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-2">
                  <input
                    type="text"
                    value={logEntryData.startTime}
                    onChange={(e) => setLogEntryData({ ...logEntryData, startTime: normalizeTimeInput(e.target.value) })}
                    onBlur={(e) => setLogEntryData({ ...logEntryData, startTime: formatTimeOnBlur(e.target.value) })}
                    placeholder="Start time"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="text"
                    value={logEntryData.endTime}
                    onChange={(e) => setLogEntryData({ ...logEntryData, endTime: normalizeTimeInput(e.target.value) })}
                    onBlur={(e) => setLogEntryData({ ...logEntryData, endTime: formatTimeOnBlur(e.target.value) })}
                    placeholder="End time"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setUseStartEndTime(false);
                    setLogEntryData(prev => ({ ...prev, startTime: '', endTime: '' }));
                  }}
                  className="text-sm text-blue-500 no-underline flex items-center gap-1.5 hover:text-blue-600"
                >
                  <Clock size={14} className="text-blue-500" />
                  <span>Enter time duration instead</span>
                </a>
              </>
            )}
          </div>
          {showTaskRatePerHour && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={logEntryData.billable}
                onChange={(e) => setLogEntryData({ ...logEntryData, billable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Billable
            </label>
          )}
          {/* User Field */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ef4444]">
              User<span className="text-red-500">*</span>
            </label>
            <div className="relative z-[60]" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setShowUserDropdown((open) => !open)}
                className="w-full px-3 py-2.5 pr-3 border border-gray-300 rounded-md text-sm outline-none bg-white text-left focus:border-blue-500 flex items-center justify-between"
              >
                <span className={logEntryData.user ? "text-gray-900" : "text-gray-400"}>
                  {logEntryData.user || "Select user"}
                </span>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
              </button>
              {showUserDropdown && (
                <div className="absolute top-full z-[9999] mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-xl">
                  <div className="border-b border-gray-200 p-2">
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-md border border-blue-400 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-[140px] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const selected = logEntryData.user === user;
                        return (
                          <button
                            key={user}
                            type="button"
                            onClick={() => {
                              setLogEntryData({ ...logEntryData, user });
                              setShowUserDropdown(false);
                              setUserSearchTerm('');
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                              selected ? "text-gray-700" : "hover:bg-blue-50 text-gray-700"
                            }`}
                          >
                            <span>{user}</span>
                            {selected && <span>✓</span>}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={logEntryData.notes}
              onChange={(e) => setLogEntryData({ ...logEntryData, notes: e.target.value })}
              placeholder="Add notes"
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none resize-y font-inherit focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={async () => {
                // Validate required fields
                let timeSpent = logEntryData.timeSpent;

                // If using start/end time, calculate duration
                if (useStartEndTime) {
                  if (!logEntryData.startTime || !logEntryData.endTime) {
                    toast.error('Please fill in both start and end time');
                    return;
                  }
                  timeSpent = calculateDuration(logEntryData.startTime, logEntryData.endTime);
                  if (!timeSpent) {
                    toast.error('End time must be after start time');
                    return;
                  }
                }

                if (!logEntryData.date || !logEntryData.projectName || !logEntryData.taskName || !timeSpent) {
                  toast.error('Please fill in all required fields');
                  return;
                }

                try {
                  const projectObj = projects.find(p => p.projectName === logEntryData.projectName);
                  
                  if (!projectObj) {
                    toast.error('Please select a valid project');
                    return;
                  }

                  // Get current user
                  const currentUser = getCurrentUser();
                  if (!currentUser) {
                    toast.error('User not found. Please log in again.');
                    return;
                  }

                  const parsedTimeSpent = parseDurationInput(timeSpent);
                  if (!parsedTimeSpent) {
                    toast.error('Invalid time spent format');
                    return;
                  }

                  const { hours, minutes } = parsedTimeSpent;

                  // Parse date from YYYY-MM-DD format to Date object
                  const entryDate = new Date(logEntryData.date);
                  if (isNaN(entryDate.getTime())) {
                    toast.error('Invalid date format');
                    return;
                  }

                  // Create new log entry payload for backend
                  // Backend expects: project (ObjectId), user (ObjectId), date (Date), hours, minutes, description, billable, task
                  const newEntry = {
                    project: projectObj.id, // Project ID (ObjectId)
                    projectId: projectObj.id,
                    projectName: projectObj.projectName || projectObj.name || "",
                    user: selectedUserRecord?._id || selectedUserRecord?.id || currentUser.id, // User ID (ObjectId)
                    userId: selectedUserRecord?._id || selectedUserRecord?.id || currentUser.id,
                    userName: selectedUserRecord ? getUserDisplayName(selectedUserRecord) : currentUserLabel,
                    date: entryDate.toISOString(), // ISO date string
                    hours: hours || 0,
                    minutes: minutes || 0,
                    timeSpent: `${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`,
                    description: logEntryData.notes || '',
                    billable: logEntryData.billable !== undefined ? logEntryData.billable : true,
                    task: logEntryData.taskName || '',
                    taskName: logEntryData.taskName || '',
                    notes: logEntryData.notes || '',
                  };

                  const isEditing = Boolean(entryId);
                  if (isEditing) {
                    await timeEntriesAPI.update(entryId, newEntry);
                  } else {
                    await timeEntriesAPI.create(newEntry);
                  }

                  toast.success(isEditing ? 'Time entry updated successfully!' : 'Time entry created successfully!');

                  // Dispatch custom event to notify other components
                  window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

                  // Reset form and close
                  setUseStartEndTime(false);
                  setLogEntryData({
                    date: new Date().toISOString().split('T')[0], // Reset to today's date in YYYY-MM-DD format
                    projectName: defaultProjectName,
                    taskName: '',
                    timeSpent: '',
                    startTime: '',
                    endTime: '',
                    billable: true,
                    user: '',
                    notes: ''
                  });
                  onClose();
                } catch (error) {
                  console.error("Error saving time entry:", error);
                  toast.error("Failed to save time entry: " + (error.message || "Unknown error"));
                }
              }}
              className="px-4 py-2 border-none rounded-md bg-[#156372] text-white cursor-pointer text-sm font-semibold transition-colors hover:bg-[#0f4f5c]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleStartTimer}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Start Timer
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




