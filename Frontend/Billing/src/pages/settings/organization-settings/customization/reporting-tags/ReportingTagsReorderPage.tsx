import React, { useEffect, useState } from "react";
import { ChevronLeft, GripVertical, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { reportingTagsAPI } from "../../../../../services/api";

interface Tag {
  _id: string;
  name: string;
  description?: string;
  isMandatory?: boolean;
  isActive: boolean;
  isInactive?: boolean;
  orderIndex?: number;
}

type DragState = {
  draggedId: string | null;
  overId: string | null;
};

export default function ReportingTagsReorderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderedTags, setOrderedTags] = useState<Tag[]>([]);
  const [dragState, setDragState] = useState<DragState>({ draggedId: null, overId: null });

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportingTagsAPI.getAll();
      if (res?.success) {
        const raw = res.data || [];
        const sorted = [...raw].sort((a, b) => {
          const aOrder = typeof a.orderIndex === "number" ? a.orderIndex : Number.POSITIVE_INFINITY;
          const bOrder = typeof b.orderIndex === "number" ? b.orderIndex : Number.POSITIVE_INFINITY;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        });
        setOrderedTags(sorted);
      }
    } catch (e) {
      console.error("Failed to load reporting tags:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const moveTag = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setOrderedTags((prev) => {
      const list = [...prev];
      const fromIndex = list.findIndex((t) => t._id === fromId);
      const toIndex = list.findIndex((t) => t._id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return list;
    });
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ordered = orderedTags;
      for (let i = 0; i < ordered.length; i += 1) {
        const tag = ordered[i];
        await reportingTagsAPI.update(tag._id, { orderIndex: i + 1 });
      }
      navigate("/settings/customization/reporting-tags");
    } catch (e) {
      console.error("Failed to save order:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings/customization/reporting-tags")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Back"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-[15px] font-normal text-gray-900">Reorder Reporting Tags</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-2 text-[13px] font-medium text-white bg-[#156372] rounded hover:bg-[#0f4d5a] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => navigate("/settings/customization/reporting-tags")}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Close"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-[13px] text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Loading reporting tags...
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
              {orderedTags.map((tag) => (
                <tr
                  key={tag._id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", tag._id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragState({ draggedId: tag._id, overId: tag._id });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragState.overId !== tag._id) {
                      setDragState((prev) => ({ ...prev, overId: tag._id }));
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragState.draggedId && dragState.overId) {
                      moveTag(dragState.draggedId, dragState.overId);
                    }
                    setDragState({ draggedId: null, overId: null });
                  }}
                  onDragEnd={() => setDragState({ draggedId: null, overId: null })}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-gray-400" />
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
                    <span className="text-[13px] text-gray-600">{tag.description || "-"}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[13px] text-gray-600">{tag.isMandatory ? "Yes" : "No"}</span>
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
