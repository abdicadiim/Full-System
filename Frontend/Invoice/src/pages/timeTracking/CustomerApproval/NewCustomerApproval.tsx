import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown, Plus, Info, Calendar, Search } from "lucide-react";
import { customersAPI, projectsAPI, timeEntriesAPI } from "../../../services/api";
import toast from "react-hot-toast";

export default function NewCustomerApproval() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    customerId: "",
    approvalName: "",
    projectId: "",
    description: "",
    dueDate: "",
  });

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, projectsRes] = await Promise.all([
          customersAPI.getAll(),
          projectsAPI.getAll()
        ]);
        
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    navigate("/time-tracking/customer-approvals");
  };

  const handleSave = async (submit = false) => {
    if (!formData.customerId || !formData.approvalName) {
      toast.error("Please fill in required fields");
      return;
    }
    
    // Logic to save customer approval
    toast.success(submit ? "Approval saved and submitted" : "Approval saved");
    navigate("/time-tracking/customer-approvals");
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <h1 className="text-[20px] font-semibold text-slate-900 m-0">Create Customer Approval</h1>
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 border-none bg-transparent cursor-pointer"
        >
          <X size={24} />
        </button>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
        <div className="max-w-5xl">
          {/* Main Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* Customer Name - Full Width in grid span? Actually in design it's usually rows. 
                Let's follow the screenshot precisely. */}
            
            <div className="col-span-full">
               <div className="flex flex-col gap-2">
                 <label className="text-[13px] font-medium text-slate-700">Customer Name</label>
                 <div className="relative">
                   <select
                     name="customerId"
                     value={formData.customerId}
                     onChange={handleInputChange}
                     className="w-full md:w-1/2 h-10 px-3 border border-slate-200 rounded text-[13px] text-slate-700 bg-white focus:border-[#2563eb] outline-none appearance-none cursor-pointer transition-all"
                   >
                     <option value="">Select customer</option>
                     {customers.map((c: any) => (
                       <option key={c.id || c._id} value={c.id || c._id}>{c.displayName || c.name}</option>
                     ))}
                   </select>
                   <ChevronDown size={14} className="absolute right-[51%] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none hidden md:block" />
                   <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none md:hidden" />
                 </div>
               </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-slate-700 flex items-center gap-1">
                Approval Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="approvalName"
                value={formData.approvalName}
                onChange={handleInputChange}
                className="w-full h-10 px-3 border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-[#2563eb] transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-slate-700">Projects</label>
              <div className="relative">
                <select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 border border-slate-200 rounded text-[13px] text-slate-700 bg-white focus:border-[#2563eb] outline-none appearance-none cursor-pointer transition-all"
                >
                  <option value="">Select a project</option>
                  {projects.map((p: any) => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.projectName || p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-slate-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full h-24 px-3 py-2 border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-[#2563eb] resize-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-slate-700">Due Date</label>
              <div className="relative">
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-[#2563eb] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Timesheet Section */}
          <div className="mt-16 border-t border-slate-100 pt-10">
            <h2 className="text-[16px] font-bold text-slate-400 m-0 mb-6 font-sans">Timesheet</h2>
            
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[13px] text-slate-500 font-medium">Period:</span>
              <div className="relative">
                <button
                   onClick={() => {}}
                   className="flex items-center gap-1.5 text-[13px] text-slate-400 font-bold border-none bg-transparent cursor-pointer hover:text-slate-600"
                >
                  {selectedPeriod} <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Empty Table Design */}
            <div className="border border-slate-100 rounded overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-100">
                    <th className="w-10 px-4 py-3"><input type="checkbox" disabled className="rounded border-slate-300" /></th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">DATE</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PROJECT</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CUSTOMER</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">TASK</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">USER</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">TIME</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center">
                      <div className="text-[14px] text-slate-400 font-medium italic">
                        There are no time entries for the selected period.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
               className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-[#2563eb] border border-transparent bg-[#f0f7ff] hover:bg-[#e0efff] px-3 py-1.5 rounded transition-all cursor-pointer"
            >
              <Plus size={16} /> Log Time
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-5 border-t border-slate-100 bg-white flex items-center gap-3 sticky bottom-0 z-50">
        <button
          onClick={() => handleSave(false)}
          className="h-10 px-8 bg-[#2563eb] text-white text-[14px] font-bold rounded hover:bg-[#1d4ed8] transition-all border-none cursor-pointer shadow-sm disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => handleSave(true)}
          className="h-10 px-6 bg-[#f8fafc] text-slate-500 text-[14px] font-medium rounded border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
        >
          Save and Submit
        </button>
        <button
          onClick={handleCancel}
          className="h-10 px-8 bg-white text-slate-500 text-[14px] font-medium rounded border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
