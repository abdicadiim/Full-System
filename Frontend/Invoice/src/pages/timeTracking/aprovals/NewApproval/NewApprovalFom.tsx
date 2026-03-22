import React from 'react';
import { X, ChevronDown, Clock, CheckSquare, PlusCircle } from 'lucide-react';

interface NewApprovalFormProps {
  onClose: () => void;
}

const NewApprovalForm: React.FC<NewApprovalFormProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans text-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Create Approval</h1>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Projects Field */}
        <div className="flex items-start gap-12">
          <label className="w-32 text-sm text-slate-600 pt-2">Projects</label>
          <div className="flex-1 max-w-xl relative">
            <div className="flex items-center gap-2 border border-blue-400 rounded px-3 py-1.5 min-h-[40px] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded flex items-center gap-1 border border-blue-200">
                sdf <X size={12} className="cursor-pointer" />
              </span>
              <ChevronDown size={16} className="absolute right-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Approval Name Field */}
        <div className="flex items-start gap-12">
          <label className="w-32 text-sm text-slate-600 pt-2 flex gap-1">
            Approval Name<span className="text-red-500">*</span>
          </label>
          <div className="flex-1 max-w-xl">
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Description Field */}
        <div className="flex items-start gap-12">
          <label className="w-32 text-sm text-slate-600 pt-2">Description</label>
          <div className="flex-1 max-w-xl">
            <textarea 
              rows={4}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Timesheet Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Timesheet <span className="bg-[#25b87e] text-white text-xs px-2 py-0.5 rounded-full">1</span>
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 ml-auto">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-slate-400" /> 01:00 Hrs
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <CheckSquare size={14} /> 1 Project Tasks
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            Period: 
            <button className="text-blue-600 flex items-center gap-1 ml-1 hover:underline">
              All <ChevronDown size={14} />
            </button>
          </div>

          {/* Timesheet Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-[11px] font-bold uppercase tracking-wider">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 accent-blue-600" />
                  </th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Approver</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium normal-case text-slate-600">
                <tr>
                  <td className="px-4 py-4">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 accent-blue-600" />
                  </td>
                  <td className="px-4 py-4">28 Feb 2026</td>
                  <td className="px-4 py-4 text-blue-500">sdf</td>
                  <td className="px-4 py-4">wef</td>
                  <td className="px-4 py-4">Abdi Ladiif</td>
                  <td className="px-4 py-4 text-right font-bold text-slate-900">01:00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button className="flex items-center gap-1.5 text-blue-500 text-sm font-semibold hover:bg-blue-50 px-2 py-1 rounded">
            <PlusCircle size={16} /> Log Time
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
        <button className="bg-[#25b87e] hover:bg-[#1f9d6b] text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors">
          Save
        </button>
        <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded text-sm font-semibold">
          Save and Submit
        </button>
        <button onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded text-sm font-semibold">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NewApprovalForm;