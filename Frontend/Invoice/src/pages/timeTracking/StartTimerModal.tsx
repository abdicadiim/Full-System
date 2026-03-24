import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, Clock, Plus, Search } from "lucide-react";
import { toast } from "react-toastify";
import { projectsAPI } from "../../services/api";
import { syncRemoteTimer } from "../../lib/timeTracking/timerSync";

type TimerState = {
  isTimerRunning?: boolean;
  startTime?: number;
  elapsedTime?: number;
  pausedElapsedTime?: number;
  timerNotes?: string;
  associatedProject?: string;
  selectedProjectForTimer?: string;
  selectedTaskForTimer?: string;
  isBillable?: boolean;
  lastUpdated?: number;
};

type StartTimerModalProps = {
  open: boolean;
  onClose: () => void;
  elapsedTime?: number;
  defaultProjectName?: string;
  defaultTaskName?: string;
};

type ProjectRecord = {
  id?: string;
  _id?: string;
  projectName?: string;
  name?: string;
  tasks?: any[];
};

const formatTimeVerbose = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(secs).padStart(2, "0")}s`;
};

export default function StartTimerModal({
  open,
  onClose,
  elapsedTime = 0,
  defaultProjectName = "",
  defaultTaskName = "",
}: StartTimerModalProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjectFields, setShowProjectFields] = useState(false);
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState(defaultProjectName);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState(defaultTaskName);
  const [isBillable, setIsBillable] = useState(true);
  const [timerNotes, setTimerNotes] = useState("");
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [isCreatingTaskInline, setIsCreatingTaskInline] = useState(false);
  const taskDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedProjectForTimer(defaultProjectName);
    setSelectedTaskForTimer(defaultTaskName);
    setIsBillable(true);
    setTimerNotes("");
    setTaskSearchTerm("");
    setShowTaskDropdown(false);
    setIsCreatingTaskInline(false);
    setShowProjectFields(Boolean(defaultProjectName));
  }, [open, defaultProjectName, defaultTaskName]);

  useEffect(() => {
    if (!open) return;

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await projectsAPI.getAll();
        const data = Array.isArray(response) ? response : (response?.data || []);
        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [open]);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          (project.projectName || project.name || "") === selectedProjectForTimer
      ),
    [projects, selectedProjectForTimer]
  );

  const timerTaskOptions = useMemo(() => {
    const rawTasks = selectedProject?.tasks || [];
    const names = rawTasks
      .map((task: any) => String(task?.taskName || task?.name || task?.title || "").trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [selectedProject]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target as Node)) {
        setShowTaskDropdown(false);
      }
    };

    if (showTaskDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTaskDropdown]);

  const handleStartTimer = () => {
    if (!selectedProjectForTimer || !selectedTaskForTimer) {
      toast.error("Please select a project and task");
      return;
    }

    const timerState: TimerState = {
      isTimerRunning: true,
      startTime: Date.now(),
      elapsedTime: 0,
      pausedElapsedTime: 0,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer,
      selectedTaskForTimer,
      isBillable,
      lastUpdated: Date.now(),
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    syncRemoteTimer(timerState);
    window.dispatchEvent(new CustomEvent("timerStateUpdated"));
    toast.success("The timer has been started.");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/55 px-5 pt-16"
    >
      <div className="w-full max-w-[430px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="relative border-b border-gray-200 px-5 py-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <Clock size={14} className="text-gray-500" />
            <h2 className="m-0 text-[13px] font-medium tracking-wide text-gray-700">
              START TIMER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded bg-transparent p-0 text-gray-800 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 text-center">
            <div className="text-[30px] font-semibold leading-none tracking-wide text-gray-800">
              {formatTimeVerbose(elapsedTime)}
            </div>
          </div>

          {!showProjectFields && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowProjectFields(true)}
                className="flex items-center gap-2 border-none bg-transparent p-0 text-sm text-[#156372] no-underline hover:no-underline"
              >
                <Plus size={14} />
                Associate Project
              </button>
            </div>
          )}

          {showProjectFields && (
            <div className="mb-4 space-y-3">
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
                  <option value="">{loadingProjects ? "Loading projects..." : "Select a project"}</option>
                  {projects.map((project) => {
                    const value = project.projectName || project.name || "";
                    return (
                      <option key={project.id || project._id || value} value={value}>
                        {value}
                      </option>
                    );
                  })}
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

          <div className="mb-4">
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
              className="rounded-md border-none bg-[#156372] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f4f5c]"
            >
              Start Timer
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
