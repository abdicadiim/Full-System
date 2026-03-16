import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  X, Search, ArrowUpDown, ChevronRight, ChevronDown, Download, Upload, 
  Settings, Eye, EyeOff, Info, List, LayoutGrid, SlidersHorizontal, 
  MoreVertical, MoreHorizontal, Plus, Pause, Play, Square, Trash2, 
  AlertTriangle, Clock, CheckCircle, XCircle 
} from "lucide-react";
import { toast } from "react-toastify";

interface ApprovalEntry {
  id: string;
  projectName: string;
  customerName: string;
  description: string;
  submittedBy: string;
  date: string;
  hours: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export default function Aptouvals() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [approvals, setApprovals] = useState<ApprovalEntry[]>([
    {
      id: "app-001",
      projectName: "Web Development",
      customerName: "Acme Corp",
      description: "Frontend implementation",
      submittedBy: "John Doe",
      date: "2024-03-15",
      hours: "08:30",
      status: "Pending"
    },
    {
      id: "app-002",
      projectName: "Mobile App",
      customerName: "Global Tech",
      description: "API Integration",
      submittedBy: "Jane Smith",
      date: "2024-03-14",
      hours: "05:15",
      status: "Approved"
    }
  ]);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  const views = [
    { id: "All", label: "All Approvals" },
    { id: "Pending", label: "Pending Approvals" },
    { id: "Approved", label: "Approved Approvals" },
    { id: "Rejected", label: "Rejected Approvals" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setShowNewDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(app => {
      const matchesSearch = 
        app.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesView = selectedView === "All" || app.status === selectedView;
      
      return matchesSearch && matchesView;
    });
  }, [approvals, searchTerm, selectedView]);

  const handleBulkStatusUpdate = (status: 'Approved' | 'Rejected') => {
    const updated = approvals.map(app => 
      selectedApprovals.includes(app.id) ? { ...app, status } : app
    );
    setApprovals(updated);
    setSelectedApprovals([]);
    toast.success(`Successfully ${status.toLowerCase()} ${selectedApprovals.length} entries`);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete selected entries?")) {
      const remaining = approvals.filter(app => !selectedApprovals.includes(app.id));
      setApprovals(remaining);
      setSelectedApprovals([]);
      toast.success("Successfully deleted entries");
    }
  };

  return (
    <div className="flex flex-col w-full relative h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Header */}
      {selectedApprovals.length === 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 sticky top-0 z-30 shadow-sm">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 border-none bg-transparent p-0 text-[32px] font-semibold text-gray-800 hover:text-gray-900 cursor-pointer"
            >
              {views.find(v => v.id === selectedView)?.label}
              <ChevronDown size={14} className="text-[#156372]" />
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[210px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                {views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => { setSelectedView(view.id); setIsDropdownOpen(false); }}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center justify-between rounded border px-3 py-2 text-left text-sm ${selectedView === view.id ? "border-[#156372] bg-[#156372]/10 text-gray-800" : "border-transparent text-gray-700 hover:bg-gray-50"} border-none cursor-pointer`}
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
                className={`flex items-center justify-center border-none px-3 py-1.5 ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'} cursor-pointer transition-all`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center justify-center border-none px-3 py-1.5 ${viewMode === 'grid' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'} cursor-pointer transition-all`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Clock size={16} />
              Start
            </button>

            <div ref={newDropdownRef} className="relative flex items-center">
              <button
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
                    onClick={() => { setShowNewDropdown(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Plus size={14} />
                    New Approval Task
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
                    onClick={() => { setShowMoreMenu(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Download size={14} />
                    Export Approvals
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Header */}
      {selectedApprovals.length > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 sticky top-0 z-30 shadow-sm transition-all animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('Approved')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('Rejected')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
            >
              Reject
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-[#156372] px-2 py-0.5 text-xs font-semibold text-white">{selectedApprovals.length}</span>
            <span className="text-sm text-gray-700">Selected</span>
            <button
              onClick={() => setSelectedApprovals([])}
              className="text-red-500 hover:text-red-600 border-none bg-transparent cursor-pointer p-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-white flex flex-col">
        {/* Search Bar Row */}
        <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4 text-sm text-gray-500 italic">
            VIEW BY: {selectedView}
          </div>
          <div className="flex items-center gap-2 max-w-[300px] w-full border border-gray-200 rounded-md px-3 py-1.5 focus-within:border-[#156372] transition-colors">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Approvals" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none bg-transparent outline-none text-sm w-full font-sans"
            />
          </div>
        </div>

        {/* View Content */}
        {filteredApprovals.length > 0 ? (
          viewMode === 'list' ? (
            <div className="flex-1 overflow-auto border-t border-gray-100">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                  <tr className="border-b border-gray-200">
                    <th className="w-[60px] px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedApprovals.length === filteredApprovals.length && filteredApprovals.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedApprovals(filteredApprovals.map(a => a.id));
                          else setSelectedApprovals([]);
                        }}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">PROJECT & CUSTOMER</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">SUBMITTED BY</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">HOURS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map((app) => (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedApprovals.includes(app.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedApprovals([...selectedApprovals, app.id]);
                            else setSelectedApprovals(selectedApprovals.filter(id => id !== app.id));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-sans">{app.date}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-[#156372] font-sans">{app.projectName}</div>
                        <div className="text-xs text-gray-500 font-sans">{app.customerName}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-sans">{app.submittedBy}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-sans font-medium">{app.hours}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredApprovals.map((app) => (
                  <div 
                    key={app.id} 
                    className={`bg-white rounded-lg border ${selectedApprovals.includes(app.id) ? 'border-[#156372] ring-1 ring-[#156372]' : 'border-gray-200'} p-5 hover:shadow-md transition-all cursor-pointer relative group`}
                    onClick={() => {
                      if (selectedApprovals.includes(app.id)) setSelectedApprovals(selectedApprovals.filter(id => id !== app.id));
                      else setSelectedApprovals([...selectedApprovals, app.id]);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1 font-sans">{app.date}</div>
                        <div className="text-lg font-semibold text-[#156372] font-sans leading-tight">{app.projectName}</div>
                        <div className="text-sm text-gray-600 font-sans">{app.customerName}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Submitted by:</span>
                        <span className="text-gray-800 font-medium">{app.submittedBy}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Hours:</span>
                        <span className="text-gray-800 font-bold">{app.hours}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 italic font-sans truncate">
                      "{app.description}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Clock size={32} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 font-sans text-center">
              No entries waiting for approval
            </h2>
            <p className="text-gray-500 text-center max-w-[400px] mb-8 font-sans">
              When users submit their time logs for review, they will appear here for you to approve or reject.
            </p>
            <button 
              className="h-11 px-6 rounded-md bg-[#22b573] hover:bg-[#1ca363] transition-colors text-white text-sm font-semibold tracking-wide border-none cursor-pointer"
            >
              CREATE APPROVAL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
