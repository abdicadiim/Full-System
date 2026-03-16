import React, { useState, useEffect } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportingTagsAPI } from "../../../../../services/api";
import { toast } from "react-toastify";

interface Tag {
  _id: string;
  name: string;
  color?: string;
  description?: string;
  appliesTo: string[];
  isMandatory?: boolean;
  isActive: boolean;
  isInactive?: boolean;
  orderIndex?: number;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export default function ReportingTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
  const refreshTags = async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      if (response.success) {
        setTags(response.data || []);
      }
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const handleSetInactive = async (id: string, isInactive: boolean) => {
    try {
      await reportingTagsAPI.update(id, { isInactive });
      setOpenMenuId(null);
      toast.success(isInactive ? "Reporting tag marked as inactive." : "Reporting tag marked as active.");
      await refreshTags();
    } catch (error) {
      console.error("Failed to update inactive status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await reportingTagsAPI.delete(id);
      setOpenMenuId(null);
      toast.success("Reporting tag deleted.");
      await refreshTags();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  const sortedTags = tags
    .map((tag, index) => ({ tag, index }))
    .sort((a, b) => {
      const aOrder = typeof a.tag.orderIndex === "number" ? a.tag.orderIndex : Number.POSITIVE_INFINITY;
      const bOrder = typeof b.tag.orderIndex === "number" ? b.tag.orderIndex : Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.index - b.index;
    })
    .map(({ tag }) => tag);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Header Section */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-[15px] font-normal text-gray-900">Reporting Tags</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/settings/customization/reporting-tags/new")}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#156372] rounded hover:bg-[#0f4d5a] flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            New Reporting Tag
          </button>
          <button
            onClick={() => navigate("/settings/customization/reporting-tags/reorder")}
            className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <span className="text-[14px] leading-none">⋮⋮</span>
            Change Order
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1">
        {sortedTags.length === 0 ? (
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
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTags.map((tag, index) => (
                <tr
                  key={tag._id || index}
                  className="hover:bg-gray-50/50 group transition-colors cursor-pointer"
                  onClick={() => navigate(`/settings/customization/reporting-tags/${tag._id}`)}
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-900">{tag.name}</span>
                      {tag.isInactive ? (
                        <span className="text-[12px] text-gray-500">(Inactive)</span>
                      ) : !tag.isActive ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-100 text-gray-600">
                          Not Ready
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-600">{tag.description || '-'}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-600">
                      {tag.isMandatory ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
                      <button
                        className="text-[13px] text-blue-600 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/settings/customization/reporting-tags/${tag._id}/edit`);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        title="More"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === tag._id ? null : tag._id));
                        }}
                      >
                        <MoreVertical size={14} className="text-gray-600" />
                      </button>
                      {openMenuId === tag._id && (
                        <div
                          className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full text-left px-3 py-2 text-[13px] text-blue-600 hover:bg-gray-50"
                            onClick={() => handleSetInactive(tag._id, !tag.isInactive)}
                          >
                            {tag.isInactive ? "Mark as Active" : "Mark as Inactive"}
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(tag._id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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






