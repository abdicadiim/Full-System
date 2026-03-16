import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown, Clock } from "lucide-react";
import api, { projectsAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import toast from "react-hot-toast";

const timeEntriesAPI = (api as any).timeEntriesAPI;

export default function NewLogEntryForm({
  onClose,
  defaultProjectName = "",
  defaultDate = null,
  onStartTimer = undefined,
}) {
  const navigate = useNavigate();
  const [useStartEndTime, setUseStartEndTime] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const taskDropdownRef = useRef(null);
  // Helper function to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') {
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
    taskName: '',
    timeSpent: '',
    startTime: '',
    endTime: '',
    billable: true,
    user: '',
    notes: ''
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

  // Get tasks from selected project
  const selectedProject = projects.find(p => p.projectName === logEntryData.projectName);
  const availableTasks = selectedProject?.tasks || [];

  // Filter tasks based on search term
  const filteredTasks = availableTasks.filter(task => {
    const taskName = task.taskName || 'Untitled Task';
    return taskName.toLowerCase().includes(taskSearchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target)) {
        setShowTaskDropdown(false);
        setTaskSearchTerm('');
      }
    };

    if (showTaskDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDropdown]);

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

  const displayTimeSpent = resolvedTimeSpent && resolvedTimeSpent.includes(":") ? resolvedTimeSpent : "00:00";
  const [spentHours, spentMinutes] = displayTimeSpent.split(":").map((value) => Number(value) || 0);
  const totalHours = spentHours + spentMinutes / 60;
  const costPerHour = Number(selectedProject?.billingRate || 0);
  const totalCost = totalHours * costPerHour;
  const currencyCode = String(selectedProject?.currency || "USD").substring(0, 3).toUpperCase();

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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-2 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 m-0 mb-1">
              New Log Entry
            </h2>
            <p className="text-xs text-gray-500 m-0">
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
        <div className="p-6">
          {/* Date Field */}
          <div className="mb-5">
            <label className="text-sm font-medium text-[#ef4444] block mb-1.5">
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
          <div className="mb-5">
            <label className="text-sm font-medium text-[#ef4444] block mb-1.5">
              Project Name<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={logEntryData.projectName}
                onChange={(e) => {
                  setLogEntryData({
                    ...logEntryData,
                    projectName: e.target.value,
                    taskName: '' // Reset task when project changes
                  });
                }}
                className="w-full px-3 py-2.5 pr-9 border border-blue-500 rounded-md text-sm outline-none appearance-none cursor-pointer bg-white focus:border-blue-500"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.projectName}>
                    {project.projectName}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronDown size={14} />
              </span>
            </div>
          </div>

          {/* Task Name Field */}
          <div className="mb-5">
            <label className="text-sm font-medium text-[#ef4444] block mb-1.5">
              Task Name<span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={taskDropdownRef}>
              {isCreatingNewTask ? (
                <input
                  type="text"
                  value={logEntryData.taskName}
                  onChange={(e) => setLogEntryData({ ...logEntryData, taskName: e.target.value })}
                  onBlur={() => {
                    if (logEntryData.taskName) {
                      setIsCreatingNewTask(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsCreatingNewTask(false);
                    }
                  }}
                  placeholder="Enter task name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <>
                  <input
                    type="text"
                    value={logEntryData.taskName}
                    readOnly
                    onClick={() => {
                      if (logEntryData.projectName) {
                        setShowTaskDropdown(!showTaskDropdown);
                      }
                    }}
                    disabled={!logEntryData.projectName}
                    placeholder="Select task"
                    className={`w-full px-3 py-2.5 pr-9 border rounded-md text-sm outline-none ${logEntryData.projectName
                        ? 'border-gray-300 cursor-pointer bg-white text-gray-900 focus:border-blue-500'
                        : 'border-gray-300 cursor-not-allowed bg-gray-50 text-gray-400'
                      }`}
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                    style={{ transform: showTaskDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <ChevronDown size={14} />
                  </span>
                  {showTaskDropdown && logEntryData.projectName && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <input
                            type="text"
                            value={taskSearchTerm}
                            onChange={(e) => setTaskSearchTerm(e.target.value)}
                            placeholder="Search"
                            className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-auto">
                        {filteredTasks.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">NO RESULTS FOUND</div>
                        ) : (
                          filteredTasks.map((task, index) => {
                            const taskName = task.taskName || 'Untitled Task';
                            return (
                              <div
                                key={index}
                                onClick={() => {
                                  setLogEntryData({ ...logEntryData, taskName });
                                  setShowTaskDropdown(false);
                                  setTaskSearchTerm('');
                                }}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              >
                                {taskName}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="p-2 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setIsCreatingNewTask(true);
                            setShowTaskDropdown(false);
                            setLogEntryData({ ...logEntryData, taskName: '' });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 rounded-md text-sm font-medium"
                        >
                          <span className="text-blue-500">+</span>
                          <span>New Task</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Time Spent Field */}
          <div className="mb-5">
            <label className="text-sm font-medium text-[#ef4444] flex items-center gap-1.5 mb-1.5">
              Time Spent<span className="text-red-500">*</span>
              <div className="w-[18px] h-[18px] rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 cursor-help">?</div>
            </label>
            {!useStartEndTime ? (
              <>
                <input
                  type="text"
                  value={logEntryData.timeSpent}
                  onChange={(e) => setLogEntryData({ ...logEntryData, timeSpent: e.target.value })}
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
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="time"
                    value={logEntryData.startTime}
                    onChange={(e) => setLogEntryData({ ...logEntryData, startTime: e.target.value })}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="time"
                    value={logEntryData.endTime}
                    onChange={(e) => setLogEntryData({ ...logEntryData, endTime: e.target.value })}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
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
          {/* User Field */}
          <div className="mb-5">
            <label className="text-sm font-medium text-[#ef4444] block mb-1.5">
              User<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={logEntryData.user}
                onChange={(e) => setLogEntryData({ ...logEntryData, user: e.target.value })}
                className="w-full px-3 py-2.5 pr-9 border border-gray-300 rounded-md text-sm outline-none appearance-none cursor-pointer bg-white focus:border-blue-500"
              >
                <option value="">Select user</option>
                <option value="tabanaaaa">tabanaaaa</option>
                <option value="user2">user2</option>
                <option value="user3">user3</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronDown size={14} />
              </span>
            </div>
          </div>

          <div className="mb-5 text-sm text-gray-800">
            <div className="font-medium text-gray-700">Total Cost</div>
            <div className="mt-1 text-gray-700">
              {currencyCode} {totalCost.toFixed(2)} for {displayTimeSpent} hours (Cost Per Hour: {currencyCode} {costPerHour.toFixed(2)})
            </div>
          </div>

          {/* Notes Field */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
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
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
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

                  // Parse HH:MM to hours and minutes
                  const [hours, minutes] = timeSpent.split(':').map(Number);

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
                    user: currentUser.id, // User ID (ObjectId) - backend will use this or current user
                    date: entryDate.toISOString(), // ISO date string
                    hours: hours || 0,
                    minutes: minutes || 0,
                    description: logEntryData.notes || '',
                    billable: logEntryData.billable !== undefined ? logEntryData.billable : true,
                    task: logEntryData.taskName || '',
                  };

                  await timeEntriesAPI.create(newEntry);

                  toast.success('Time entry saved successfully!');

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
              className="px-5 py-2.5 border-none rounded-md text-white cursor-pointer text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "#2563eb" }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleStartTimer}
              className="px-5 py-2.5 border border-gray-300 rounded-md bg-white cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Start Timer
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-md bg-white cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




