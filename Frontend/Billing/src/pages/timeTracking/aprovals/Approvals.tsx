import React, { useState } from 'react';
import { ChevronDown, Plus, Clock, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import NewApprovalForm from './NewApprovalForm'; // Importing the form

const Approvals = () => {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <NewApprovalForm onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-700">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
        <div className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
          <h1 className="text-lg font-semibold text-slate-900">All Approval</h1>
          <ChevronDown size={16} className="text-blue-600 mt-1" />
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50">
            <Clock size={14} /> Start
          </button>
          <div className="flex shadow-sm">
            {/* CLICKING THIS BUTTON NOW OPENS THE FORM */}
            <button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-[#25b87e] hover:bg-[#1f9d6b] text-white px-3 py-1.5 rounded-l text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New
            </button>
            <button className="bg-[#25b87e] hover:bg-[#1f9d6b] text-white px-1.5 py-1.5 rounded-r border-l border-[#1a8a5d]">
              <ChevronDown size={16} />
            </button>
          </div>
          <button className="p-1.5 border border-slate-300 rounded hover:bg-slate-50">
            <MoreHorizontal size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-4 flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        <span>View By:</span>
        <button className="flex items-center gap-1 text-blue-600 capitalize hover:underline">
          Received for Approval
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Table Section */}
      <div className="w-full">
        <table className="w-full border-t border-slate-100">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
              <th className="px-6 py-3 font-bold flex items-center gap-1 cursor-pointer">
                Name <ArrowUpDown size={12} />
              </th>
              <th className="px-6 py-3 font-bold">Approver</th>
              <th className="px-6 py-3 font-bold">Hours</th>
              <th className="px-6 py-3 font-bold">Submitted On</th>
              <th className="px-6 py-3 font-bold">Status</th>
            </tr>
          </thead>
        </table>
        
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-slate-300 text-xl font-light">There are no Approvals</p>
        </div>
      </div>
    </div>
  );
};

export default Approvals;