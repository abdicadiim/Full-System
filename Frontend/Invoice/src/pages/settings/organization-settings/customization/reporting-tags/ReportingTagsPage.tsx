import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportingTagsAPI } from "../../../../../services/api";

interface Tag {
  _id: string;
  name: string;
  color?: string;
  description?: string;
  appliesTo: string[];
  isMandatory?: boolean;
  isActive: boolean;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export default function ReportingTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);

  // Load tags from API
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll();
        if (response.success) {
          setTags(response.data || []);
        }
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };
    loadTags();
  }, []);

  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Header Section */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-[15px] font-normal text-gray-900">Reporting Tags</h1>
        <button
          onClick={() => navigate("/settings/customization/reporting-tags/new")}
          className="px-4 py-2 text-[13px] font-medium text-white bg-[#156372] rounded hover:bg-[#0f4d5a] flex items-center gap-2 transition-colors"
        >
          <Plus size={14} />
          New Reporting Tag
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1">
        {tags.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-[14px] text-gray-400">There are no reporting tags</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#fafbfc] border-b border-gray-200">
              <tr>
                <th className="px-8 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  REPORTING TAG NAME
                </th>
                <th className="px-8 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  DESCRIPTION
                </th>
                <th className="px-8 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  MANDATORY
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tags.map((tag, index) => (
                <tr
                  key={tag._id || index}
                  className="hover:bg-gray-50/50 group transition-colors cursor-pointer"
                  onClick={() => navigate(`/settings/customization/reporting-tags/${tag._id}`)}
                >
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-900">{tag.name}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-600">{tag.description || '-'}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-600">
                      {tag.isMandatory ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}



