import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Info } from "lucide-react";
import { projectsAPI, timeEntriesAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import toast from "react-hot-toast";

export default function WeeklyTimeLog() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1); // Start week on Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([
    { id: 1, project: "", task: "", days: ["", "", "", "", "", "", ""], billable: true, total: "00:00" },
    { id: 2, project: "", task: "", days: ["", "", "", "", "", "", ""], billable: true, total: "00:00" },
    { id: 3, project: "", task: "", days: ["", "", "", "", "", "", ""], billable: true, total: "00:00" },
  ]);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        const data = Array.isArray(response) ? response : (response?.data || []);
        setProjects(data.map(p => ({
          id: p._id || p.id,
          projectName: p.name || p.projectName,
          tasks: p.tasks || []
        })));
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      }
    };
    fetchProjects();
  }, []);

  const getWeekDates = () => {
    const dates = [];
    const startDate = new Date(currentWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const formatDateDisplay = (date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      monthShort: monthsShort[date.getMonth()],
    };
  };

  const formatWeekRange = () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const start = weekDates[0];
    const end = weekDates[6];
    
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
    } else {
      return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
    }
  };

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
    setYear(newWeek.getFullYear());
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
    setYear(newWeek.getFullYear());
  };

  const getTasksForProject = (projectName) => {
    const project = projects.find((p) => p.projectName === projectName);
    return project?.tasks || [];
  };

  const addNewRow = () => {
    const newRow = {
      id: Date.now(),
      project: "",
      task: "",
      days: ["", "", "", "", "", "", ""],
      billable: true,
      total: "00:00",
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (rowId) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== rowId));
    } else {
      setRows([{ id: Date.now(), project: "", task: "", days: ["", "", "", "", "", "", ""], billable: true, total: "00:00" }]);
    }
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.trim()) return 0;
    const time = timeStr.trim();
    if (time.includes(":")) {
      const [hours, minutes] = time.split(":").map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    }
    if (time.includes("h") || time.includes("m")) {
      const hoursMatch = time.match(/(\d+)h/);
      const minutesMatch = time.match(/(\d+)m/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      return hours * 60 + minutes;
    }
    const decimal = parseFloat(time);
    if (!isNaN(decimal)) {
      if (time.startsWith('.') && decimal >= 0.1 && decimal <= 0.6) {
        return Math.round(decimal * 10);
      }
      const hours = Math.floor(decimal);
      const minutes = Math.round((decimal % 1) * 60);
      return hours * 60 + minutes;
    }
    return 0;
  };

  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const formatTimeInput = (value) => {
    if (!value || !value.trim()) return "";
    const trimmed = value.trim();
    if (/^\d{1,2}:\d{1,2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("h") || trimmed.includes("m")) return trimmed;
    if (trimmed.startsWith('.') && trimmed.length <= 3) {
      const decimal = parseFloat(trimmed);
      if (!isNaN(decimal) && decimal >= 0.1 && decimal <= 0.6) {
        return formatMinutesToTime(Math.round(decimal * 10));
      }
    }
    const decimal = parseFloat(trimmed);
    if (!isNaN(decimal)) {
      const hours = Math.floor(Math.abs(decimal));
      const fractionalPart = Math.abs(decimal) % 1;
      const minutes = Math.round(fractionalPart * 60);
      return formatMinutesToTime(hours * 60 + minutes);
    }
    return trimmed;
  };

  const updateRow = (rowId, field, value, shouldFormat = false) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          if (field.startsWith("day")) {
            const dayIndex = parseInt(field.replace("day", ""));
            const newDays = [...row.days];
            const finalValue = shouldFormat ? formatTimeInput(value) : value;
            newDays[dayIndex] = finalValue;
            const total = calculateTotal(newDays);
            return { ...row, days: newDays, total };
          } else {
            return { ...row, [field]: value };
          }
        }
        return row;
      })
    );
  };

  const calculateTotal = (days) => {
    let totalMinutes = 0;
    days.forEach((day) => {
      totalMinutes += parseTimeToMinutes(day);
    });
    return formatMinutesToTime(totalMinutes);
  };

  const calculateDayTotals = () => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    rows.forEach((row) => {
      row.days.forEach((day, index) => {
        totals[index] += parseTimeToMinutes(day);
      });
    });
    return totals.map((minutes) => formatMinutesToTime(minutes));
  };

  const dayTotals = calculateDayTotals();
  const grandTotal = dayTotals.reduce((acc, time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return acc + hours * 60 + minutes;
  }, 0);
  const grandTotalFormatted = formatMinutesToTime(grandTotal);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/time-tracking/timesheet")}
            className="flex items-center text-[#2563eb] hover:bg-gray-50 p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-800 m-0">Weekly Time Log</h1>
        </div>
        <button
          onClick={() => navigate("/time-tracking/timesheet")}
          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 border-none bg-transparent cursor-pointer"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation Sub-header */}
      <div className="px-10 py-6">
        <div className="text-sm font-medium text-slate-500 mb-6">Year : {year}</div>
        <div className="flex items-center justify-center gap-8 mb-4">
          <button
            onClick={goToPreviousWeek}
            className="text-slate-700 hover:text-[#2563eb] border-none bg-transparent cursor-pointer transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-3">
             {formatWeekRange()}
          </div>
          <button
            onClick={goToNextWeek}
            className="text-slate-700 hover:text-[#2563eb] border-none bg-transparent cursor-pointer transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto px-10 pb-20">
        <div className="border border-slate-200 rounded-[4px] overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-200">
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[220px]">PROJECT</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[220px]">TASK</th>
                {weekDates.map((date, index) => {
                  const f = formatDateDisplay(date);
                  return (
                    <th key={index} className="px-3 py-4 text-center border-l border-slate-100 min-w-[80px]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{f.day}</div>
                      <div className="text-[11px] font-medium text-slate-400 mt-1">{f.date} {f.monthShort}</div>
                    </th>
                  );
                })}
                <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-100 min-w-[70px]">BILLABLE</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-100 min-w-[90px]">TOTAL</th>
                <th className="w-[45px] border-l border-slate-100"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tasks = row.project ? getTasksForProject(row.project) : [];
                return (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 group">
                    <td className="p-3">
                      <select
                        className="w-full h-11 px-3 border border-slate-200 rounded text-[13px] text-slate-700 bg-white focus:border-[#2563eb] outline-none cursor-pointer appearance-none transition-all"
                        value={row.project}
                        onChange={(e) => updateRow(row.id, "project", e.target.value)}
                      >
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.projectName}>
                            {project.projectName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        className="w-full h-11 px-3 border border-slate-200 rounded text-[13px] text-slate-700 bg-white focus:border-[#2563eb] outline-none cursor-pointer appearance-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                        value={row.task}
                        onChange={(e) => updateRow(row.id, "task", e.target.value)}
                        disabled={!row.project}
                      >
                        <option value="">Select task</option>
                        {tasks.filter(task => task != null).map((task, index) => {
                          let taskName = typeof task === 'string' ? task : ((task as any).taskName || (task as any).name || 'Untitled');
                          return <option key={index} value={taskName}>{taskName}</option>;
                        })}
                      </select>
                    </td>
                    {row.days.map((day, dayIndex) => (
                      <td key={dayIndex} className="p-2 border-l border-slate-100">
                        <input
                          type="text"
                          className="w-full h-11 text-center border-none bg-transparent text-[13px] text-slate-900 placeholder-slate-300 focus:bg-white focus:ring-1 focus:ring-[#2563eb] rounded transition-all outline-none"
                          value={day}
                          onChange={(e) => updateRow(row.id, `day${dayIndex}`, e.target.value, false)}
                          onBlur={(e) => updateRow(row.id, `day${dayIndex}`, e.target.value, true)}
                          placeholder="00:00"
                        />
                      </td>
                    ))}
                    <td className="p-3 text-center border-l border-slate-100">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                        checked={row.billable}
                        onChange={(e) => updateRow(row.id, "billable", e.target.checked)}
                      />
                    </td>
                    <td className="p-3 text-center text-[13px] font-semibold text-slate-700 border-l border-slate-100 bg-[#f8fafc]/30">
                      {row.total}
                    </td>
                    <td className="p-3 text-center border-l border-slate-100">
                      <button 
                        onClick={() => deleteRow(row.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Total Footer Row */}
              <tr className="bg-[#f8fafc] font-bold border-t border-slate-200">
                <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right" colSpan={2}>
                  TOTAL
                </td>
                {dayTotals.map((total, index) => (
                  <td key={index} className="px-3 py-4 text-center border-l border-slate-100 text-[13px] text-slate-700">
                    {total}
                  </td>
                ))}
                <td className="border-l border-slate-100"></td>
                <td className="px-4 py-4 text-center border-l border-slate-100 text-[13px] text-slate-800">
                  {grandTotalFormatted}
                </td>
                <td className="border-l border-slate-100"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Buttons Below Table */}
        <div className="flex items-center justify-between mt-6">
          <button 
            onClick={addNewRow}
            className="flex items-center gap-2 bg-[#2563eb] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#1d4ed8] transition-all border-none bg-transparent cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            Add New Row
          </button>
          
          <button
            onClick={() => {
              toast((t) => (
                <div className="flex flex-col gap-2 p-1">
                  <div className="font-bold text-[#1e40af] flex items-center gap-1.5">
                    <Info size={16} /> Supported Time Formats
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                    <div>• 2:50 (2h 50m)</div>
                    <div>• .5 (30m)</div>
                    <div>• 10:5 (10h 5m)</div>
                    <div>• 7 (7h)</div>
                    <div>• 3.5 (3h 30m)</div>
                    <div>• :35 (35m)</div>
                  </div>
                </div>
              ), { duration: 6000, style: { padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }});
            }}
            className="flex items-center gap-1.5 text-[#2563eb] text-[13px] font-medium hover:underline border-none bg-transparent cursor-pointer"
          >
            <Info size={16} className="text-[#2563eb]" />
            Supported Time Formats
          </button>
        </div>
      </div>

      {/* Persistent Footer Actions */}
      <div className="px-10 py-5 border-t border-gray-100 bg-white flex items-center gap-4 fixed bottom-0 left-0 right-0 z-50">
        <button
          onClick={async () => {
             try {
                const currentUser = getCurrentUser();
                if (!currentUser) { toast.error('User not found. Please log in again.'); return; }
                const newEntries = [];
                for (const row of rows) {
                  if (row.project && row.task) {
                    for (let dayIndex = 0; dayIndex < row.days.length; dayIndex++) {
                      const dayTime = row.days[dayIndex];
                      if (dayTime && dayTime.trim() !== '') {
                        const entryDate = new Date(weekDates[dayIndex]);
                        const projectObj = projects.find(p => (p.projectName || p.name) === row.project);
                        if (!projectObj) continue;
                        const [hours, minutes] = dayTime.includes(':') ? dayTime.trim().split(':').map(Number) : [Math.floor(parseTimeToMinutes(dayTime)/60), parseTimeToMinutes(dayTime)%60];
                        newEntries.push({
                          project: projectObj.id,
                          user: currentUser.id,
                          date: entryDate.toISOString(),
                          hours: hours || 0,
                          minutes: minutes || 0,
                          description: '',
                          billable: row.billable,
                          task: row.task,
                        });
                      }
                    }
                  }
                }
                if (newEntries.length === 0) { toast.error("Please add at least one time entry."); return; }
                await Promise.all(newEntries.map(entry => timeEntriesAPI.create(entry)));
                window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                toast.success(`Successfully saved ${newEntries.length} time entries`);
                navigate("/time-tracking/timesheet");
              } catch (error) { toast.error("Failed to save entries"); }
          }}
          className="h-10 px-8 bg-[#2563eb] text-white text-[14px] font-bold rounded hover:bg-[#1d4ed8] transition-all border-none cursor-pointer shadow-md"
        >
          Save
        </button>
        <button
          onClick={() => navigate("/time-tracking/timesheet")}
          className="h-10 px-8 bg-white text-slate-600 text-[14px] font-medium rounded border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
