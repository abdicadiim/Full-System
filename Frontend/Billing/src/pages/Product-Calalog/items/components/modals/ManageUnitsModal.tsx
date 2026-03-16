import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Ruler } from "lucide-react";
import { toast } from "react-toastify";
import { unitsAPI } from "../../../../../services/api";
import { useOrganizationBranding } from "../../../../../hooks/useOrganizationBranding";

interface ManageUnitsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUnitsChanged: () => void;
}

export default function ManageUnitsModal({ isOpen, onClose, onUnitsChanged }: ManageUnitsModalProps) {
    const { accentColor } = useOrganizationBranding();
    const [units, setUnits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newUnitName, setNewUnitName] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUnits();
        }
    }, [isOpen]);

    const fetchUnits = async () => {
        setIsLoading(true);
        try {
            const response = await unitsAPI.getAll();
            setUnits(response.data || response || []);
        } catch (error: any) {
            toast.error("Failed to load units");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;

        setIsSaving(true);
        try {
            await unitsAPI.create({ name: newUnitName.trim() });
            toast.success("Unit added successfully");
            setNewUnitName("");
            setShowAddForm(false);
            fetchUnits();
            onUnitsChanged();
        } catch (error: any) {
            toast.error(error.message || "Failed to add unit");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUnit = async (id: string) => {
        if (!confirm("Are you sure you want to delete this unit?")) return;

        try {
            await unitsAPI.delete(id);
            toast.success("Unit deleted successfully");
            fetchUnits();
            onUnitsChanged();
        } catch (error: any) {
            toast.error("Failed to delete unit");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Ruler size={18} className="text-teal-600" />
                        <h3 className="text-lg font-bold">Manage Units</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-teal-600" />
                        </div>
                    ) : units.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No custom units added yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {units.map((unit) => (
                                <div key={unit._id || unit.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-teal-100 hover:bg-teal-50/30 transition-all group">
                                    <span className="text-sm font-medium text-slate-700">{unit.unitName}</span>
                                    <button
                                        onClick={() => handleDeleteUnit(unit._id || unit.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    {showAddForm ? (
                        <form onSubmit={handleAddUnit} className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                            <div>
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newUnitName}
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    placeholder="e.g. bundle, roll, tray"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isSaving || !newUnitName.trim()}
                                    className="flex-1 h-10 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAddForm(false); setNewUnitName(""); }}
                                    className="px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full h-10 border-2 border-dashed border-slate-200 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2 text-sm font-bold rounded-lg"
                        >
                            <Plus size={16} />
                            Add Extra Unit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

