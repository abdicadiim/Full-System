import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  X, Search, ChevronDown, Download, Upload, 
  List, LayoutGrid, SlidersHorizontal, 
  MoreHorizontal, Plus, Clock, Users, Calendar, Mail, CheckSquare, FileText, XCircle, CheckCircle2 
} from "lucide-react";
import { toast } from "react-toastify";

interface CustomerApprovalEntry {
  id: string;
  projectName: string;
  customerName: string;
  description: string;
  date: string;
  hours: string;
  status: 'Pending' | 'Sent' | 'Approved' | 'Rejected';
}

export default function CustomerApproval() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [approvals, setApprovals] = useState<CustomerApprovalEntry[]>([
    {
      id: "ca-001",
      projectName: "Website Overhaul",
      customerName: "Blue Ocean Corp",
      description: "Homepage redesign and SEO",
      date: "2024-03-15",
      hours: "12:00",
      status: "Pending"
    },
    {
      id: "ca-002",
      projectName: "ERP System",
      customerName: "Starlight Industries",
      description: "Database migration",
      date: "2024-03-14",
      hours: "04:30",
      status: "Sent"
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
    { id: "All", label: "All Customer Approvals" },
    { id: "Pending", label: "Pending" },
    { id: "Sent", label: "Sent" },
    { id: "Approved", label: "Approved" },
    { id: "Rejected", label: "Rejected" },
  ];

  const selectedViewLabel = views.find(v => v.id === selectedView)?.label || "All Customer Approvals";

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
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
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
    toast.success(`Successfully marked ${selectedApprovals.length} entries as ${status.toLowerCase()}`);
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
              {selectedViewLabel}
              <ChevronDown className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={24} />
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-[1200] mt-2 min-w-[240px] rounded-md border border-gray-200 bg-white py-2 shadow-xl">
                {views.map(view => (
                  <button
                    key={view.id}
                    onClick={() => { setSelectedView(view.id as any); setIsDropdownOpen(false); }}
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
                onClick={() => navigate('/time-tracking/customer-approvals/new')}
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
                    onClick={() => { navigate('/time-tracking/customer-approvals/new'); setShowNewDropdown(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                  >
                    <Plus size={14} />
                    Create Customer Approval
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
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 sticky top-0 z-30 shadow-sm">
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
          <div className="flex items-center gap-4 text-sm text-gray-500 italic uppercase tracking-wider font-semibold">
            VIEW BY: <span className="text-[#156372]">{selectedView}</span>
          </div>
          <div className="flex items-center gap-2 max-w-[300px] w-full border border-gray-200 rounded-md px-3 py-1.5 focus-within:border-[#156372] transition-colors">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Customer Approvals" 
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 font-sans tracking-wider">HOURS</th>
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
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          app.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-sans font-medium">{app.hours}</td>
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
                        app.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-t border-gray-50">
                      <span className="text-gray-500">Billable Hours:</span>
                      <span className="text-gray-800 font-bold">{app.hours}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto bg-white pt-10 pb-20">
            <div className="max-w-4xl mx-auto text-center px-4">
              <h2 className="text-3xl font-semibold text-slate-800 mb-3 font-sans">Get time entries approved by customers.</h2>
              <p className="text-slate-500 text-lg mb-10 font-sans">
                Create customer approvals for time entries and send them to your customers for approval.
              </p>
              <button className="bg-[#25b87e] hover:bg-[#1f9d6b] text-white font-bold py-3.5 px-8 rounded uppercase text-sm tracking-wider transition-colors border-none cursor-pointer shadow-lg shadow-emerald-100">
                Create Customer Approval
              </button>
            </div>

            {/* Lifecycle Flowchart */}
            <div className="max-w-5xl mx-auto mt-24 px-4">
              <h3 className="text-center text-slate-700 text-xl mb-16 font-sans">Life cycle of a Customer Approval</h3>
              
              <div className="relative flex items-center justify-center gap-4 mb-20 overflow-x-auto py-10">
                <FlowStep icon={<Calendar className="text-blue-500" size={18} />} label="TIME ENTRIES" />
                <Arrow />
                <FlowStep icon={<Users className="text-green-500" size={18} />} label="CUSTOMER APPROVAL" />
                <Arrow />
                <FlowStep icon={<Mail className="text-purple-500" size={18} />} label="SENT TO CUSTOMER" />
                
                <div className="flex flex-col gap-8 ml-8">
                  <FlowStep icon={<CheckSquare className="text-green-500" size={18} />} label="APPROVE" small />
                  <FlowStep icon={<XCircle className="text-red-500" size={18} />} label="REJECT" small />
                </div>
                
                <div className="ml-8 self-start mt-[-10px]">
                   <Arrow />
                   <FlowStep icon={<FileText className="text-blue-400" size={18} />} label="INVOICE" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-16 max-w-2xl mx-auto">
                <h3 className="text-center text-slate-700 font-sans mb-8 text-lg">In the Customer Approvals module, you can:</h3>
                <ul className="space-y-4 text-sm text-slate-600 ml-12 font-sans">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Create and submit customer approvals for time entries.
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Interact with your customers about time entries.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components for Flowchart
const FlowStep = ({ icon, label, small = false }: { icon: React.ReactNode, label: string, small?: boolean }) => (
  <div className={`flex items-center gap-2 border border-blue-400 rounded bg-white shadow-sm font-sans ${small ? 'px-3 py-1.5' : 'px-4 py-3'}`}>
    {icon}
    <span className={`font-bold text-slate-600 tracking-tighter ${small ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
  </div>
);

const Arrow = () => (
  <div className="flex items-center">
    <div className="h-0.5 w-6 bg-blue-200 border-t border-dashed border-blue-400"></div>
    <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-blue-400"></div>
  </div>
);