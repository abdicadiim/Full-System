import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    X,
    HelpCircle,
    Search,
    Check,
    Plus,
    Settings,
    Upload,
    ChevronDown,
    Info,
    RefreshCw,
} from "lucide-react";
import {
    itemsAPI,
    unitsAPI,
    accountantAPI,
    taxesAPI,
    reportingTagsAPI,
    vendorsAPI,
} from "../../../../services/api";
import { Item, Z } from "../itemsModel";
import NewAccountModal from "../../../../components/modals/NewAccountModal";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import NewVendorModal from "../../../../components/modals/NewVendorModal";
import ManageUnitsModal from "./modals/ManageUnitsModal";
import ZohoSelect from "../../../../components/ZohoSelect";

interface EditItemFormProps {
    item: Item;
    onCancel: () => void;
    onUpdate: (data: any) => Promise<void>;
    baseCurrency?: any;
}

const Label = ({ children, required = false, help = true, tooltip, htmlFor }: { children: React.ReactNode; required?: boolean; help?: boolean; tooltip?: React.ReactNode; htmlFor?: string }) => (
    <div className="flex items-center gap-1 w-full md:w-[140px] shrink-0">
        <label htmlFor={htmlFor} className={`block text-[13px] font-medium ${required ? "text-red-500" : "text-slate-600"}`}>
            {children}{required && "*"}
        </label>
        {help && (
            <div className="relative group/help">
                <HelpCircle className="h-3.5 w-3.5 text-slate-300 cursor-help" />
                {tooltip && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all duration-200 pointer-events-none z-[9999] shadow-lg w-64">
                        {tooltip}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-800"></div>
                    </div>
                )}
            </div>
        )}
    </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = ({ className = "", error, ...props }: InputProps) => (
    <input
        {...props}
        className={`block w-full max-w-[400px] rounded-md border text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1b5e6a] focus:border-[#1b5e6a] transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
        style={error ? { borderColor: '#ef4444', ringColor: '#ef4444' } : {}}
    />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: boolean;
}

const Select = ({ className = "", children, error, ...props }: SelectProps) => (
    <div className="relative w-full max-w-[400px]">
        <select
            {...props}
            className={`w-full appearance-none rounded-md border px-3 py-1.5 pr-8 text-[13px] text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#1b5e6a] focus:border-[#1b5e6a] bg-white transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
        >
            {children}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

const Textarea = ({ className = "", error, ...props }: TextareaProps) => (
    <textarea
        {...props}
        className={`block w-full max-w-[400px] rounded-md border px-3 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1b5e6a] focus:border-[#1b5e6a] resize-none transition-all ${error ? "border-red-500 ring-red-500/20 ring-1" : "border-slate-200"} ${className}`}
        rows={2}
    />
);

export default function EditItemForm({ item, onCancel, onUpdate, baseCurrency }: EditItemFormProps) {
    const navigate = useNavigate();
    const currencyCode = baseCurrency?.symbol || baseCurrency?.code || "USD";
    const [form, setForm] = useState({
        type: item.type || "Goods",
        name: item.name || "",
        sku: item.sku || "",
        unit: item.unit || "pcs",
        sellable: item.sellingPrice !== undefined,
        sellingPrice: item.sellingPrice?.toString() || "",
        salesAccount: item.salesAccount || "Sales",
        salesDescription: item.salesDescription || "",
        salesTax: item.taxInfo ? `${item.taxInfo.taxName} [${item.taxInfo.taxRate}%]` : "Select a Tax",
        purchasable: item.costPrice !== undefined,
        costPrice: item.costPrice?.toString() || "",
        purchaseAccount: item.purchaseAccount || "Cost of Goods Sold",
        purchaseDescription: item.purchaseDescription || "",
        purchaseTax: item.purchaseTaxInfo ? `${item.purchaseTaxInfo.taxName} [${item.purchaseTaxInfo.taxRate}%]` : "Select a Tax",
        preferredVendor: item.preferredVendor || "",
        trackInventory: item.trackInventory || false,
        inventoryAccount: item.inventoryAccount || "Inventory Asset",
        inventoryValuationMethod: item.inventoryValuationMethod || "FIFO (First In First Out)",
        reorderPoint: item.reorderPoint?.toString() || "",
        currency: item.currency || currencyCode,
    });

    const [images, setImages] = useState<string[]>(item.images || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [dbUnits, setDbUnits] = useState<any[]>([]);
    const [dbAccounts, setDbAccounts] = useState<any[]>([]);
    const [dbTaxes, setDbTaxes] = useState<any[]>([]);
    const [dbVendors, setDbVendors] = useState<any[]>([]);
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(item.tagIds || []);

    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [pendingTaxField, setPendingTaxField] = useState<"salesTax" | "purchaseTax">("salesTax");
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountModalDefaultType, setAccountModalDefaultType] = useState("");
    const [pendingAccountField, setPendingAccountField] = useState<"salesAccount" | "purchaseAccount" | "inventoryAccount">("salesAccount");
    const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        try {
            const [u, a, t, v, tags] = await Promise.all([
                unitsAPI.getAll(),
                accountantAPI.getAccounts({ limit: 1000 }),
                taxesAPI.getAll(),
                vendorsAPI.getAll(),
                reportingTagsAPI.getAll()
            ]);
            setDbUnits(u.data || u || []);
            setDbAccounts(Array.isArray(a?.data || a) ? (a.data || a) : []);
            setDbTaxes(t.data || t || []);
            setDbVendors(v.data || v || []);
            setAvailableTags(tags.data || tags || []);
        } catch (e) {
            console.error("Data fetch failed", e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (value === "NEW_ACCOUNT") {
            setPendingAccountField(name as any);
            setAccountModalDefaultType(name === "salesAccount" ? "Income" : name === "purchaseAccount" ? "Expense" : "Asset");
            setIsAccountModalOpen(true);
            return;
        }

        if (value === "NEW_TAX") {
            setPendingTaxField(name as any);
            setIsTaxModalOpen(true);
            return;
        }

        if (value === "NEW_VENDOR") {
            setIsVendorModalOpen(true);
            return;
        }

        if (value === "MANAGE_UNITS") {
            setIsManageUnitsModalOpen(true);
            return;
        }

        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, boolean> = {};

        if (!form.name.trim()) newErrors.name = true;

        if (form.sellable) {
            if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) newErrors.sellingPrice = true;
            if (!form.salesAccount) newErrors.salesAccount = true;
        }

        if (form.purchasable) {
            if (!form.costPrice || parseFloat(form.costPrice) <= 0) newErrors.costPrice = true;
            if (!form.purchaseAccount) newErrors.purchaseAccount = true;
        }

        if (form.trackInventory) {
            if (!form.inventoryAccount) newErrors.inventoryAccount = true;
            if (!form.inventoryValuationMethod) newErrors.inventoryValuationMethod = true;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsLoading(true);
        try {
            await onUpdate({ ...form, images, tagIds: selectedTagIds });
        } catch (error) {
            console.error("Submission failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#fbfcff] min-h-screen font-sans flex flex-col">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
                <h2 className="text-[18px] font-bold text-slate-800">Edit Item</h2>
                <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-slate-50 transition-colors">
                    <X size={20} className="text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col pb-24">
                {/* Top Section - Basic Info & Image */}
                <div className="p-4 md:p-8 bg-[#f9faff]">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                        {/* Left: Info Grid */}
                        <div className="flex-1 space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required help={false}>Name</Label>
                                <Input name="name" value={form.name} onChange={handleChange} error={errors.name} />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label>Type</Label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="radio" name="type" value="Goods" checked={form.type === "Goods"} onChange={handleChange} className="w-4 h-4 border-slate-300" style={{ accentColor: '#1b5e6a' }} />
                                        <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">Goods</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="radio" name="type" value="Service" checked={form.type === "Service"} onChange={handleChange} className="w-4 h-4 border-slate-300" style={{ accentColor: '#1b5e6a' }} />
                                        <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">Service</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label tooltip="The item will be measured in terms of this unit (e.g.: kg, dozen)">Unit</Label>
                                <ZohoSelect
                                    value={form.unit}
                                    onChange={(val) => setForm(f => ({ ...f, unit: val }))}
                                    options={[...["cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs"], ...dbUnits]}
                                    onAddNew={() => setIsManageUnitsModalOpen(true)}
                                    addNewLabel="Manage Units"
                                    placeholder="Select or type to add"
                                    className="w-full max-w-[400px]"
                                />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label tooltip="The Stock Keeping Unit of the item">SKU</Label>
                                <Input name="sku" value={form.sku} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Right: Image Upload Area */}
                        <div className="w-full md:w-[300px] shrink-0">
                            <div
                                className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-md bg-white flex flex-col items-center justify-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/20 transition-all p-4 text-center group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {images.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 w-full h-full">
                                        {images.map((img, i) => (
                                            <div key={i} className="relative h-full group/img rounded overflow-hidden border border-slate-100">
                                                <img src={img} className="w-full h-full object-cover" alt="" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)) }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                    <X size={16} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < 4 && (
                                            <div className="h-full border border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50">
                                                <Plus size={20} className="text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <ImageIcon size={40} className="text-slate-200 mb-3 group-hover:text-teal-600 transition-colors" />
                                        <p className="text-[12px] text-slate-500">
                                            Drag Image(s) here or <br />
                                            <span className="font-medium" style={{ color: '#1b5e6a' }}>Browse Images</span>
                                        </p>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>
                </div>

                {/* Sales Information Section */}
                <div className="p-4 md:p-8 bg-white border-y border-slate-100">
                    <div className="flex items-center gap-2 mb-8">
                        <input type="checkbox" name="sellable" checked={form.sellable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: '#1b5e6a' }} />
                        <h3 className="text-[14px] font-semibold text-slate-800">Sales Information</h3>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 transition-opacity duration-200 ${!form.sellable ? "opacity-40 pointer-events-none" : ""}`}>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Selling Price</Label>
                            <div className="flex w-full max-w-[400px] group">
                                <span className={`h-9 px-3 border border-r-0 rounded-l flex items-center bg-slate-50 text-slate-400 text-[11px] font-medium transition-colors group-focus-within:border-teal-400 group-focus-within:bg-white ${errors.sellingPrice ? "border-red-500" : "border-slate-200"}`}>{currencyCode}</span>
                                <Input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleChange} className="rounded-l-none" error={errors.sellingPrice} />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Account</Label>
                            <ZohoSelect
                                value={form.salesAccount}
                                onChange={(val) => {
                                    setErrors(prev => ({ ...prev, salesAccount: false }));
                                    if (val === "NEW_ACCOUNT") {
                                        setPendingAccountField("salesAccount");
                                        setAccountModalDefaultType("Income");
                                        setIsAccountModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, salesAccount: val }));
                                    }
                                }}
                                error={errors.salesAccount}
                                options={dbAccounts.filter(a => ["income", "other_income"].includes(a.accountType?.toLowerCase()))}
                                groupBy="accountType"
                                onAddNew={() => {
                                    setPendingAccountField("salesAccount");
                                    setAccountModalDefaultType("Income");
                                    setIsAccountModalOpen(true);
                                }}
                                addNewLabel="New Account"
                                className="w-full max-w-[400px]"
                            />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <Label help={false}>Description</Label>
                            <Textarea name="salesDescription" value={form.salesDescription} onChange={handleChange} />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label tooltip={<>Add the sales tax that's applicable<br />for this item. Create a group tax from<br />Settings if you want to apply more than<br />one tax. This tax will be auto-populated<br />when you create transactions with this item.</>}>Tax</Label>
                            <ZohoSelect
                                value={form.salesTax}
                                onChange={(val) => setForm(f => ({ ...f, salesTax: val }))}
                                options={dbTaxes.map(t => `${t.name} [${t.rate}%]`)}
                                onAddNew={() => {
                                    setPendingTaxField("salesTax");
                                    setIsTaxModalOpen(true);
                                }}
                                addNewLabel="New Tax"
                                placeholder="Select a Tax"
                                className="w-full max-w-[400px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Purchase Information Section */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-8">
                        <input type="checkbox" name="purchasable" checked={form.purchasable} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: '#1b5e6a' }} />
                        <h3 className="text-[14px] font-semibold text-slate-800">Purchase Information</h3>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 transition-opacity duration-200 ${!form.purchasable ? "opacity-40 pointer-events-none" : ""}`}>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Cost Price</Label>
                            <div className="flex w-full max-w-[400px] group">
                                <span className={`h-9 px-3 border border-r-0 rounded-l flex items-center bg-slate-50 text-slate-400 text-[11px] font-medium transition-colors group-focus-within:border-teal-400 group-focus-within:bg-white ${errors.costPrice ? "border-red-500" : "border-slate-200"}`}>{currencyCode}</span>
                                <Input name="costPrice" type="number" value={form.costPrice} onChange={handleChange} className="rounded-l-none" error={errors.costPrice} />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label required>Account</Label>
                            <ZohoSelect
                                value={form.purchaseAccount}
                                onChange={(val) => {
                                    setErrors(prev => ({ ...prev, purchaseAccount: false }));
                                    if (val === "NEW_ACCOUNT") {
                                        setPendingAccountField("purchaseAccount");
                                        setAccountModalDefaultType("Expense");
                                        setIsAccountModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, purchaseAccount: val }));
                                    }
                                }}
                                error={errors.purchaseAccount}
                                options={dbAccounts.filter(a => ["expense", "other_expense", "cost_of_goods_sold"].includes(a.accountType?.toLowerCase()))}
                                groupBy="accountType"
                                onAddNew={() => {
                                    setPendingAccountField("purchaseAccount");
                                    setAccountModalDefaultType("Expense");
                                    setIsAccountModalOpen(true);
                                }}
                                addNewLabel="New Account"
                                className="w-full max-w-[400px]"
                            />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <Label help={false}>Description</Label>
                            <Textarea name="purchaseDescription" value={form.purchaseDescription} onChange={handleChange} />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label tooltip={<>Add the purchase tax that's applicable<br />for this item.</>}>Tax</Label>
                            <ZohoSelect
                                value={form.purchaseTax}
                                onChange={(val) => setForm(f => ({ ...f, purchaseTax: val }))}
                                options={dbTaxes.map(t => `${t.name} [${t.rate}%]`)}
                                onAddNew={() => {
                                    setPendingTaxField("purchaseTax");
                                    setIsTaxModalOpen(true);
                                }}
                                addNewLabel="New Tax"
                                placeholder="Select a Tax"
                                className="w-full max-w-[400px]"
                            />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <Label help={false}>Preferred Vendor</Label>
                            <ZohoSelect
                                value={form.preferredVendor}
                                onChange={(val) => {
                                    if (val === "NEW_VENDOR") {
                                        setIsVendorModalOpen(true);
                                    } else {
                                        setForm(f => ({ ...f, preferredVendor: val }));
                                    }
                                }}
                                options={dbVendors}
                                onAddNew={() => setIsVendorModalOpen(true)}
                                addNewLabel="New Vendor"
                                className="w-full max-w-[400px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Inventory Tracking Section */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-100">
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <input type="checkbox" name="trackInventory" checked={form.trackInventory} onChange={handleChange} className="w-4 h-4 rounded border-slate-300" style={{ accentColor: '#1b5e6a' }} />
                            <span className="text-[13px] font-medium text-slate-700">Track Inventory for this item</span>
                            <HelpCircle size={14} className="text-slate-300" />
                        </label>
                        <p className="text-[11px] text-slate-400 ml-6">
                            You cannot enable/disable inventory tracking once you've created transactions for this item
                        </p>
                    </div>

                    {form.trackInventory && (
                        <div className="mt-8 ml-0 md:ml-6 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required>Inventory Account</Label>
                                <ZohoSelect
                                    value={form.inventoryAccount}
                                    onChange={(val) => {
                                        setErrors(prev => ({ ...prev, inventoryAccount: false }));
                                        setForm(f => ({ ...f, inventoryAccount: val }));
                                    }}
                                    error={errors.inventoryAccount}
                                    options={dbAccounts.filter(a => ["asset", "other_asset", "fixed_asset", "other_current_asset"].includes(a.accountType?.toLowerCase()))}
                                    groupBy="accountType"
                                    onAddNew={() => {
                                        setPendingAccountField("inventoryAccount");
                                        setAccountModalDefaultType("Asset");
                                        setIsAccountModalOpen(true);
                                    }}
                                    addNewLabel="New Account"
                                    className="w-full max-w-[400px]"
                                />
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label required>Valuation Method</Label>
                                <Select name="inventoryValuationMethod" value={form.inventoryValuationMethod} onChange={handleChange} error={errors.inventoryValuationMethod}>
                                    <option value="FIFO (First In First Out)">FIFO (First In First Out)</option>
                                    <option value="LIFO (Last In First Out)">LIFO (Last In First Out)</option>
                                    <option value="Weighted Average">Weighted Average</option>
                                </Select>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                <Label>Reorder Point</Label>
                                <Input type="number" name="reorderPoint" value={form.reorderPoint} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Reporting Tags Section */}
                {availableTags.length > 0 && (
                    <div className="p-8 bg-white border-b border-slate-100">
                        <h3 className="text-[14px] font-semibold text-slate-800 mb-8">Reporting Tags</h3>
                        <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                            {availableTags.map((tag) => (
                                <div key={tag._id} className="flex items-center gap-4">
                                    <Label help={false}>{tag.name}</Label>
                                    <Select
                                        value={selectedTagIds.find(id => tag.options?.some((opt: any) => opt._id === id)) || ""}
                                        onChange={(e) => {
                                            const newOptionId = e.target.value;
                                            const tagOptionIds = tag.options?.map((opt: any) => opt._id) || [];
                                            const otherSelectedIds = selectedTagIds.filter(id => !tagOptionIds.includes(id));
                                            setSelectedTagIds(newOptionId ? [...otherSelectedIds, newOptionId] : otherSelectedIds);
                                        }}
                                    >
                                        <option value="">Select {tag.name}</option>
                                        {tag.options?.map((opt: any) => (
                                            <option key={opt._id} value={opt._id}>{opt.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t border-slate-100 flex items-center gap-3 z-50 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`cursor-pointer transition-all text-white px-6 py-1.5 rounded border-b-[3px] hover:brightness-110 active:border-b-0 active:translate-y-[2px] text-[13px] font-semibold flex items-center gap-2 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        style={{ backgroundColor: '#1b5e6a', borderColor: '#1b5e6a' }}
                    >
                        {isLoading && <RefreshCw className="animate-spin" size={14} />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer transition-all bg-white text-slate-600 px-6 py-1.5 rounded border-slate-200 border border-b-[3px] hover:bg-slate-50 active:border-b-0 active:translate-y-[2px] text-[13px] font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            </form>

            <NewAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} defaultType={accountModalDefaultType} onCreated={(acc) => { setDbAccounts(prev => [...prev, acc]); setForm(f => ({ ...f, [pendingAccountField]: acc.accountName || acc.name })); setIsAccountModalOpen(false); }} />
            <NewTaxModal isOpen={isTaxModalOpen} onClose={() => setIsTaxModalOpen(false)} onCreated={(tax) => { setDbTaxes(prev => [...prev, tax]); setForm(f => ({ ...f, [pendingTaxField]: `${tax.name} [${tax.rate}%]` })); }} />
            <NewVendorModal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} onCreated={(v) => { setDbVendors(prev => [...prev, v]); setForm(f => ({ ...f, preferredVendor: v.name })); }} />
            <ManageUnitsModal isOpen={isManageUnitsModalOpen} onClose={() => setIsManageUnitsModalOpen(false)} onUnitsChanged={fetchData} />
        </div>
    );
}

const ImageIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

