import React, { useState } from "react";
import { X } from "lucide-react";
import { Item, Z } from "../../itemsModel";

interface AdjustStockProps {
    item: Item;
    onBack: () => void;
    onUpdate: (data: any) => void;
}

const uid = () => Math.random().toString(36).substr(2, 9);

export default function AdjustStock({ item, onBack, onUpdate }: AdjustStockProps) {
    const currentStock = item.stockOnHand || item.stockQuantity || 0;

    const [form, setForm] = useState({
        adjustmentType: "quantity",
        date: new Date().toISOString().split("T")[0],
        account: "Cost of Goods Sold",
        referenceNumber: "",
        newQuantity: currentStock.toString(),
        quantityAdjusted: "",
        costPrice: item.costPrice?.toString() || "0",
        reason: "",
        description: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((f) => {
            const newQty = parseFloat(value) || 0;
            const adjusted = newQty - currentStock;
            return {
                ...f,
                newQuantity: value,
                quantityAdjusted: adjusted !== 0 ? (adjusted > 0 ? `+${adjusted}` : `${adjusted}`) : "",
            };
        });
    };

    const handleAdjustedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((f) => {
            const adjusted = parseFloat(value.replace(/[+-]/g, "")) || 0;
            const direction = value.startsWith("-") ? -1 : 1;
            const newQty = currentStock + (adjusted * direction);
            return {
                ...f,
                quantityAdjusted: value,
                newQuantity: newQty.toFixed(2),
            };
        });
    };

    const handleSave = (status = "draft") => {
        if (!form.date || !form.account || !form.quantityAdjusted || !form.reason) {
            alert("Please fill in all required fields");
            return;
        }

        const adjustmentValue = parseFloat(form.quantityAdjusted.replace(/[+]/g, "")) || 0;

        const adjustment = {
            id: uid(),
            itemId: item.id || item._id,
            date: form.date,
            account: form.account,
            referenceNumber: form.referenceNumber,
            adjustmentType: form.adjustmentType,
            quantityAdjusted: adjustmentValue,
            newQuantity: parseFloat(form.newQuantity) || 0,
            costPrice: parseFloat(form.costPrice) || 0,
            reason: form.reason,
            description: form.description,
            status: status,
            createdAt: new Date().toISOString(),
        };

        const newTransaction = {
            id: uid(),
            date: form.date,
            type: "adjustment",
            qty: adjustmentValue,
            price: parseFloat(form.costPrice) || 0,
            total: adjustmentValue * (parseFloat(form.costPrice) || 0),
            status: status === "draft" ? "Draft" : "Adjusted",
            reference: form.referenceNumber,
        };

        if (onUpdate) {
            onUpdate({
                stockOnHand: parseFloat(form.newQuantity) || 0,
                transactions: [...(item.transactions || []), newTransaction]
            });
        }

        onBack();
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#ffffff" }}>
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${Z.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    Adjust Stock - {item?.name || "Unnamed Item"}
                </h1>
                <button onClick={onBack} style={{ padding: "6px", backgroundColor: "#f3f4f6", border: "none", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X className="h-5 w-5 text-slate-600" />
                </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-4xl">
                    {/* Adjustment Type */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-700">Adjustment Type</label>
                        <div className="flex items-center gap-6">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="adjustmentType" value="quantity" checked={form.adjustmentType === "quantity"} onChange={handleChange} className="h-4 w-4" />
                                <span className="text-sm text-slate-700">Quantity Adjustment</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="adjustmentType" value="value" checked={form.adjustmentType === "value"} onChange={handleChange} className="h-4 w-4" />
                                <span className="text-sm text-slate-700">Value Adjustment</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Date *</label>
                            <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full h-9 px-3 rounded border text-sm" style={{ borderColor: Z.line }} />
                            <div className="mt-1 text-xs text-slate-500">{formatDateDisplay(form.date)}</div>
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Account *</label>
                            <select name="account" value={form.account} onChange={handleChange} className="w-full h-9 px-3 rounded border text-sm bg-white" style={{ borderColor: Z.line }}>
                                <option>Cost of Goods Sold</option>
                                <option>Inventory</option>
                                <option>Expenses</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Reference Number</label>
                            <input type="text" name="referenceNumber" value={form.referenceNumber} onChange={handleChange} className="w-full h-9 px-3 rounded border text-sm" style={{ borderColor: Z.line }} />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Quantity Available</label>
                            <input type="text" value={`${currentStock.toFixed(2)} ${item?.unit || "pcs"}`} readOnly className="w-full h-9 px-3 rounded border text-sm bg-slate-50" style={{ borderColor: Z.line, color: Z.textMuted }} />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">New Quantity on hand</label>
                            <input type="number" name="newQuantity" value={form.newQuantity} onChange={handleQuantityChange} step="0.01" className="w-full h-9 px-3 rounded border text-sm" style={{ borderColor: Z.line }} />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Quantity Adjusted *</label>
                            <input type="text" name="quantityAdjusted" value={form.quantityAdjusted} onChange={handleAdjustedChange} placeholder="Eg. +10, -10" className="w-full h-9 px-3 rounded border text-sm" style={{ borderColor: Z.line }} />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Cost Price</label>
                            <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} step="0.01" className="w-full h-9 px-3 rounded border text-sm" style={{ borderColor: Z.line }} />
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">Reason *</label>
                            <select name="reason" value={form.reason} onChange={handleChange} className="w-full h-9 px-3 rounded border text-sm bg-white" style={{ borderColor: Z.line }}>
                                <option value="">Select a reason</option>
                                <option value="Damaged">Damaged</option>
                                <option value="Lost">Lost</option>
                                <option value="Theft">Theft</option>
                                <option value="Expired">Expired</option>
                                <option value="Returned">Returned</option>
                                <option value="Found">Found</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Description</label>
                        <textarea name="description" value={form.description} onChange={handleChange} rows={4} maxLength={500} placeholder="Max 500 characters" className="w-full px-3 py-2 rounded border text-sm resize-y" style={{ borderColor: Z.line }} />
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                        <button type="button" onClick={() => handleSave("draft")} className="h-9 px-4 rounded text-sm font-medium text-white" style={{ backgroundColor: Z.primary }}>Save as Draft</button>
                        <button type="button" onClick={() => handleSave("adjusted")} className="h-9 px-4 rounded border text-sm bg-white font-medium" style={{ borderColor: Z.line, color: Z.textMuted }}>Convert to Adjusted</button>
                        <button type="button" onClick={onBack} className="h-9 px-4 rounded border text-sm bg-white font-medium" style={{ borderColor: Z.line, color: Z.textMuted }}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

