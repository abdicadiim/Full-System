import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { reportingTagsAPI } from "../../services/api";

interface TaxesAdvancedSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (criteria: any) => void;
}

export default function TaxesAdvancedSearchModal({ isOpen, onClose, onSearch }: TaxesAdvancedSearchModalProps) {
    const [searchType, setSearchType] = useState("Customers");
    const [filter, setFilter] = useState("All");
    
    // Customer fields
    const [customerNumber, setCustomerNumber] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [customerType, setCustomerType] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [custStatus, setCustStatus] = useState("All");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    // Tax fields (for when searchType is "Taxes")
    const [taxName, setTaxName] = useState("");
    const [taxRate, setTaxRate] = useState("");
    const [status, setStatus] = useState("All");

    // Product fields
    const [productName, setProductName] = useState("");
    const [productStatus, setProductStatus] = useState("All");
    const [productStatusSearch, setProductStatusSearch] = useState("");

    // Item fields
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [sku, setSku] = useState("");
    const [itemRate, setItemRate] = useState("");
    const [itemStatus, setItemStatus] = useState("All");
    const [itemStatusSearch, setItemStatusSearch] = useState("");
    const [salesAccount, setSalesAccount] = useState("");
    const [salesTax, setSalesTax] = useState("");

    // Plan fields
    const [planName, setPlanName] = useState("");
    const [planCode, setPlanCode] = useState("");
    const [planStatus, setPlanStatus] = useState("All");
    const [planStatusSearch, setPlanStatusSearch] = useState("");

    // Invoice fields
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceReference, setInvoiceReference] = useState("");
    const [invoiceCustomer, setInvoiceCustomer] = useState("");
    const [invoiceStatus, setInvoiceStatus] = useState("All");
    const [invoiceStatusSearch, setInvoiceStatusSearch] = useState("");
    const [invoiceAmountMin, setInvoiceAmountMin] = useState("");
    const [invoiceAmountMax, setInvoiceAmountMax] = useState("");
    const [invoiceDateStart, setInvoiceDateStart] = useState("");
    const [invoiceDateEnd, setInvoiceDateEnd] = useState("");

    // Expense fields
    const [expenseReference, setExpenseReference] = useState("");
    const [expenseVendor, setExpenseVendor] = useState("");
    const [expenseAccount, setExpenseAccount] = useState("");
    const [expenseStatus, setExpenseStatus] = useState("All");
    const [expenseAmountMin, setExpenseAmountMin] = useState("");
    const [expenseAmountMax, setExpenseAmountMax] = useState("");
    const [expenseDateStart, setExpenseDateStart] = useState("");
    const [expenseDateEnd, setExpenseDateEnd] = useState("");

    // Project fields
    const [projectName, setProjectName] = useState("");
    const [projectStatus, setProjectStatus] = useState("All");
    const [projectCustomer, setProjectCustomer] = useState("");
    const [billingMethod, setBillingMethod] = useState("All");

    // Task fields
    const [taskName, setTaskName] = useState("");
    const [taskProject, setTaskProject] = useState("");
    const [taskStatus, setTaskStatus] = useState("All");

    // Timesheet fields
    const [timesheetProject, setTimesheetProject] = useState("");
    const [timesheetTask, setTimesheetTask] = useState("");
    const [timesheetStaff, setTimesheetStaff] = useState("");
    const [timesheetStatus, setTimesheetStatus] = useState("All");
    const [timesheetDateStart, setTimesheetDateStart] = useState("");
    const [timesheetDateEnd, setTimesheetDateEnd] = useState("");

    // Subscription fields
    const [subCustomer, setSubCustomer] = useState("");
    const [subPlan, setSubPlan] = useState("");
    const [subStatus, setSubStatus] = useState("All");
    const [subDateStart, setSubDateStart] = useState("");
    const [subDateEnd, setSubDateEnd] = useState("");

    // Addon fields
    const [addonName, setAddonName] = useState("");
    const [addonCode, setAddonCode] = useState("");
    const [addonStatus, setAddonStatus] = useState("All");

    // Coupon fields
    const [couponName, setCouponName] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [couponStatus, setCouponStatus] = useState("All");

    const [reportingTags, setReportingTags] = useState<any[]>([]);
    const [tagValues, setTagValues] = useState<Record<string, string>>({});
    
    // Dropdown states
    const [isSearchTypeOpen, setIsSearchTypeOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isCustStatusOpen, setIsCustStatusOpen] = useState(false);
    const [isCustTypeOpen, setIsCustTypeOpen] = useState(false);
    const [isProductStatusOpen, setIsProductStatusOpen] = useState(false);
    const [isItemStatusOpen, setIsItemStatusOpen] = useState(false);
    const [isSalesAccountOpen, setIsSalesAccountOpen] = useState(false);
    const [isSalesTaxOpen, setIsSalesTaxOpen] = useState(false);
    const [isPlanStatusOpen, setIsPlanStatusOpen] = useState(false);
    const [isInvoiceStatusOpen, setIsInvoiceStatusOpen] = useState(false);
    const [isExpenseStatusOpen, setIsExpenseStatusOpen] = useState(false);
    const [isExpenseAccountOpen, setIsExpenseAccountOpen] = useState(false);
    const [isProjectStatusOpen, setIsProjectStatusOpen] = useState(false);
    const [isBillingMethodOpen, setIsBillingMethodOpen] = useState(false);
    const [isTaskStatusOpen, setIsTaskStatusOpen] = useState(false);
    const [isTimesheetStatusOpen, setIsTimesheetStatusOpen] = useState(false);
    const [isSubStatusOpen, setIsSubStatusOpen] = useState(false);
    const [isAddonStatusOpen, setIsAddonStatusOpen] = useState(false);
    const [isCouponStatusOpen, setIsCouponStatusOpen] = useState(false);
    const [openTagId, setOpenTagId] = useState<string | null>(null);

    const searchTypeRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const custStatusRef = useRef<HTMLDivElement>(null);
    const custTypeRef = useRef<HTMLDivElement>(null);
    const productStatusRef = useRef<HTMLDivElement>(null);
    const itemStatusRef = useRef<HTMLDivElement>(null);
    const salesAccountRef = useRef<HTMLDivElement>(null);
    const salesTaxRef = useRef<HTMLDivElement>(null);
    const planStatusRef = useRef<HTMLDivElement>(null);
    const invoiceStatusRef = useRef<HTMLDivElement>(null);
    const expenseStatusRef = useRef<HTMLDivElement>(null);
    const expenseAccountRef = useRef<HTMLDivElement>(null);
    const projectStatusRef = useRef<HTMLDivElement>(null);
    const billingMethodRef = useRef<HTMLDivElement>(null);
    const taskStatusRef = useRef<HTMLDivElement>(null);
    const timesheetStatusRef = useRef<HTMLDivElement>(null);
    const subStatusRef = useRef<HTMLDivElement>(null);
    const addonStatusRef = useRef<HTMLDivElement>(null);
    const couponStatusRef = useRef<HTMLDivElement>(null);
    const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        const loadTags = async () => {
            const res = await reportingTagsAPI.getAll();
            if (res.success && Array.isArray(res.data)) {
                const normalized = res.data.map((tag: any) => {
                    const candidates = Array.isArray(tag?.options)
                        ? tag.options
                        : Array.isArray(tag?.values)
                            ? tag.values
                            : [];
                    return {
                        ...tag,
                        options: candidates.map((opt: any) => typeof opt === 'string' ? opt : (opt.value || opt.label || String(opt)))
                    };
                });
                setReportingTags(normalized);
            }
        };
        loadTags();
    }, []);

    useEffect(() => {
        if (searchType === "Taxes") setFilter("All Taxes");
        else if (searchType === "Customers") setFilter("All");
    }, [searchType]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchTypeRef.current && !searchTypeRef.current.contains(e.target as Node)) setIsSearchTypeOpen(false);
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) setIsStatusOpen(false);
            if (custStatusRef.current && !custStatusRef.current.contains(e.target as Node)) setIsCustStatusOpen(false);
            if (custTypeRef.current && !custTypeRef.current.contains(e.target as Node)) setIsCustTypeOpen(false);
            if (productStatusRef.current && !productStatusRef.current.contains(e.target as Node)) setIsProductStatusOpen(false);
            if (itemStatusRef.current && !itemStatusRef.current.contains(e.target as Node)) setIsItemStatusOpen(false);
            if (salesAccountRef.current && !salesAccountRef.current.contains(e.target as Node)) setIsSalesAccountOpen(false);
            if (salesTaxRef.current && !salesTaxRef.current.contains(e.target as Node)) setIsSalesTaxOpen(false);
            if (planStatusRef.current && !planStatusRef.current.contains(e.target as Node)) setIsPlanStatusOpen(false);
            if (invoiceStatusRef.current && !invoiceStatusRef.current.contains(e.target as Node)) setIsInvoiceStatusOpen(false);
            if (expenseStatusRef.current && !expenseStatusRef.current.contains(e.target as Node)) setIsExpenseStatusOpen(false);
            if (expenseAccountRef.current && !expenseAccountRef.current.contains(e.target as Node)) setIsExpenseAccountOpen(false);
            if (projectStatusRef.current && !projectStatusRef.current.contains(e.target as Node)) setIsProjectStatusOpen(false);
            if (billingMethodRef.current && !billingMethodRef.current.contains(e.target as Node)) setIsBillingMethodOpen(false);
            if (taskStatusRef.current && !taskStatusRef.current.contains(e.target as Node)) setIsTaskStatusOpen(false);
            if (timesheetStatusRef.current && !timesheetStatusRef.current.contains(e.target as Node)) setIsTimesheetStatusOpen(false);
            if (subStatusRef.current && !subStatusRef.current.contains(e.target as Node)) setIsSubStatusOpen(false);
            if (addonStatusRef.current && !addonStatusRef.current.contains(e.target as Node)) setIsAddonStatusOpen(false);
            if (couponStatusRef.current && !couponStatusRef.current.contains(e.target as Node)) setIsCouponStatusOpen(false);
            if (openTagId && tagRefs.current[openTagId] && !tagRefs.current[openTagId]!.contains(e.target as Node)) setOpenTagId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openTagId]);

    const searchTypes = [
         "Customers", "Products", "Items", "Plans", 
        "Addon", "Price Lists", "Coupons", "Pricing Widgets", 
        "Quotes", "Retainer Invoices", "Invoices", "Sales Receipts", 
        "Payment Links", "Payments Received", "Subscriptions", 
        "Credit Notes", "Expenses", "Recurring Expenses", 
        "Projects", "Timesheet", "Events", "Timesheet Customer Approval", 
        "Tasks", "Timesheet Approval"
    ];

    const [searchTerm, setSearchTerm] = useState("");
    const filteredSearchTypes = searchTypes.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const resetForm = () => {
        setCustomerNumber(""); setDisplayName(""); setCustomerType(""); setCompanyName("");
        setFirstName(""); setLastName(""); setEmail(""); setCustStatus("All");
        setPhone(""); setAddress(""); setNotes(""); setTaxName(""); setTaxRate("");
        setStatus("All"); setTagValues({});
        setProductName(""); setProductStatus("All"); setProductStatusSearch("");
        setItemName(""); setSku(""); setItemStatus("All"); setItemStatusSearch("");
        setItemDescription(""); setItemRate(""); setSalesAccount(""); setSalesTax("");
        setPlanName(""); setPlanCode(""); setPlanStatus("All"); setPlanStatusSearch("");
        setInvoiceNumber(""); setInvoiceReference(""); setInvoiceCustomer(""); setInvoiceStatus("All");
        setInvoiceAmountMin(""); setInvoiceAmountMax(""); setInvoiceDateStart(""); setInvoiceDateEnd("");
        setExpenseReference(""); setExpenseVendor(""); setExpenseAccount(""); setExpenseStatus("All");
        setExpenseAmountMin(""); setExpenseAmountMax(""); setExpenseDateStart(""); setExpenseDateEnd("");
        setProjectName(""); setProjectStatus("All"); setProjectCustomer(""); setBillingMethod("All");
        setTaskName(""); setTaskProject(""); setTaskStatus("All");
        setTimesheetProject(""); setTimesheetTask(""); setTimesheetStaff(""); setTimesheetStatus("All");
        setTimesheetDateStart(""); setTimesheetDateEnd("");
        setSubCustomer(""); setSubPlan(""); setSubStatus("All"); setSubDateStart(""); setSubDateEnd("");
        setAddonName(""); setAddonCode(""); setAddonStatus("All");
        setCouponName(""); setCouponCode(""); setCouponStatus("All");
    };

    if (!isOpen) return null;

    const handleSearch = () => {
        if (searchType === "Taxes") {
            onSearch({ taxName, taxRate, status, tagValues, searchType, filter });
        } else if (searchType === "Customers") {
            onSearch({ customerNumber, displayName, customerType, companyName, firstName, lastName, email, status: custStatus, phone, address, notes, tagValues, searchType, filter });
        } else if (searchType === "Products") {
            onSearch({ productName, status: productStatus, searchType, filter });
        } else if (searchType === "Items") {
            onSearch({ itemName, itemDescription, sku, itemRate, status: itemStatus, salesAccount, salesTax, tagValues, searchType, filter });
        } else if (searchType === "Plans") {
            onSearch({ planName, planCode, status: planStatus, searchType, filter });
        } else if (searchType === "Invoices") {
            onSearch({ invoiceNumber, invoiceReference, invoiceCustomer, status: invoiceStatus, invoiceAmountMin, invoiceAmountMax, invoiceDateStart, invoiceDateEnd, tagValues, searchType, filter });
        } else if (searchType === "Expenses") {
            onSearch({ expenseReference, expenseVendor, expenseAccount, status: expenseStatus, expenseAmountMin, expenseAmountMax, expenseDateStart, expenseDateEnd, tagValues, searchType, filter });
        } else if (searchType === "Projects") {
            onSearch({ projectName, status: projectStatus, projectCustomer, billingMethod, tagValues, searchType, filter });
        } else if (searchType === "Tasks") {
            onSearch({ taskName, taskProject, status: taskStatus, tagValues, searchType, filter });
        } else if (searchType === "Timesheet") {
            onSearch({ timesheetProject, timesheetTask, timesheetStaff, status: timesheetStatus, timesheetDateStart, timesheetDateEnd, tagValues, searchType, filter });
        } else if (searchType === "Subscriptions") {
            onSearch({ subCustomer, subPlan, status: subStatus, subDateStart, subDateEnd, tagValues, searchType, filter });
        } else if (searchType === "Addon") {
            onSearch({ addonName, addonCode, status: addonStatus, tagValues, searchType, filter });
        } else if (searchType === "Coupons") {
            onSearch({ couponName, couponCode, status: couponStatus, tagValues, searchType, filter });
        } else if (["Invoices", "Quotes", "Retainer Invoices", "Sales Receipts", "Credit Notes", "Payment Links", "Payments Received"].includes(searchType)) {
            onSearch({ invoiceNumber, invoiceReference, invoiceCustomer, status: invoiceStatus, invoiceAmountMin, invoiceAmountMax, invoiceDateStart, invoiceDateEnd, tagValues, searchType, filter });
        } else if (["Expenses", "Recurring Expenses"].includes(searchType)) {
            onSearch({ expenseReference, expenseVendor, expenseAccount, status: expenseStatus, expenseAmountMin, expenseAmountMax, expenseDateStart, expenseDateEnd, tagValues, searchType, filter });
        } else if (["Timesheet", "Timesheet Customer Approval", "Timesheet Approval", "Events"].includes(searchType)) {
            onSearch({ timesheetProject, timesheetTask, timesheetStaff, status: timesheetStatus, timesheetDateStart, timesheetDateEnd, tagValues, searchType, filter });
        } else if (["Price Lists", "Pricing Widgets"].includes(searchType)) {
            onSearch({ name: itemName, status: itemStatus, searchType, filter });
        }
        onClose();
    };
    return (
        <div className="fixed inset-0 z-[12000] flex items-start justify-center pt-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[1050px] z-10 flex flex-col overflow-hidden max-h-[95vh]">
                
                {/* Header */}
                <div className="flex items-center gap-6 px-8 py-5 border-b border-gray-100 relative">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 min-w-[50px]">Search</span>
                        <div className="relative min-w-[220px]" ref={searchTypeRef}>
                            <div 
                                onClick={() => setIsSearchTypeOpen(!isSearchTypeOpen)}
                                className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-gray-400 bg-white h-9"
                            >
                                <span>{searchType}</span>
                                <ChevronDown size={16} className={`text-[#1e5e6e] transition-transform ${isSearchTypeOpen ? 'rotate-180' : 'rotate-0'}`} />
                            </div>
                            {isSearchTypeOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1 flex flex-col">
                                    <div className="px-3 py-2 border-b border-gray-100">
                                        <div className="relative flex items-center">
                                            <Search size={14} className="absolute left-2.5 text-gray-400" />
                                            <input 
                                                autoFocus
                                                type="text"
                                                placeholder="Search"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#1e5e6e]"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto">
                                        {filteredSearchTypes.map(t => (
                                            <div 
                                                key={t}
                                                onClick={() => { setSearchType(t); setIsSearchTypeOpen(false); setSearchTerm(""); }}
                                                className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${searchType === t ? 'text-[#1e5e6e] font-medium' : 'text-gray-700'}`}
                                            >
                                                <span>{t}</span>
                                                {searchType === t && <div className="w-1.5 h-1.5 rounded-full bg-[#1e5e6e]" />}
                                            </div>
                                        ))}
                                        {filteredSearchTypes.length === 0 && (
                                            <div className="px-4 py-4 text-xs text-gray-400 text-center italic">No results found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 min-w-[40px]">Filter</span>
                        <div className="relative min-w-[220px]" ref={filterRef}>
                            <div 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-gray-400 bg-white h-9"
                            >
                                <span>{filter}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isFilterOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                    {(searchType === "Taxes" ? ["All Taxes", "Active Taxes", "Inactive Taxes", "Tax Groups"] : ["All", "Active", "Inactive"]).map(f => (
                                        <div 
                                            key={f}
                                            onClick={() => { setFilter(f); setIsFilterOpen(false); }}
                                            className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${filter === f ? 'text-[#1e5e6e] font-medium' : 'text-gray-700'}`}
                                        >
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={resetForm}
                        className="absolute right-16 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear all fields"
                    >
                        <X size={20} />
                    </button>
                    <button onClick={onClose} className="absolute right-6 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={22} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body - Grid Layout matching Image 2 */}
                <div className="p-8 grid grid-cols-2 gap-x-12 gap-y-5 overflow-y-auto min-h-[450px]">
                    {searchType === "Taxes" ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Tax Name</label>
                                    <input 
                                        type="text" 
                                        value={taxName}
                                        onChange={(e) => setTaxName(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9"
                                        placeholder="e.g. VAT"
                                    />
                                </div>
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={statusRef}>
                                        <div 
                                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                                            className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white"
                                        >
                                            <span>{status}</span>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["All", "Active", "Inactive"].map(s => (
                                                    <div 
                                                        key={s}
                                                        onClick={() => { setStatus(s); setIsStatusOpen(false); }}
                                                        className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${status === s ? 'text-[#1e5e6e] font-medium' : 'text-gray-700'}`}
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Tax Rate (%)</label>
                                    <input 
                                        type="text" 
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9"
                                        placeholder="e.g. 15"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Reporting Tags Area - Bottom Spanning 2 Columns */}
                            <div className="col-span-2 grid grid-cols-2 gap-x-12 gap-y-5 pt-2">
                                {reportingTags.map((tag, idx) => {
                                    const isBottomRow = idx >= reportingTags.length - 2;
                                    return (
                                        <div key={tag.id} className="flex items-center gap-4 relative" style={{ zIndex: 80 - Math.floor(idx/2) }}>
                                            <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={tag.name}>{tag.name}</label>
                                            <div className="flex-1 relative" ref={el => tagRefs.current[tag.id] = el}>
                                                <div onClick={() => setOpenTagId(openTagId === tag.id ? null : tag.id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                                    <span className={tagValues[tag.id] ? "text-gray-900" : "text-gray-400"}>
                                                        {tagValues[tag.id] || "Select a value"}
                                                    </span>
                                                    <ChevronDown size={14} className="text-gray-400" />
                                                </div>
                                                {openTagId === tag.id && (
                                                    <div className={`absolute ${isBottomRow ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-56 overflow-y-auto py-1`}>
                                                        {(tag.options || []).map((opt: string) => (
                                                            <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [tag.id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : searchType === "Customers" ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Customer Number</label>
                                    <input type="text" value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none transition-colors" />
                                </div>
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Customer Type</label>
                                    <div className="flex-1 relative" ref={custTypeRef}>
                                        <div onClick={() => setIsCustTypeOpen(!isCustTypeOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span className={customerType ? "text-gray-900" : "text-gray-400"}>{customerType || "Select a value"}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {isCustTypeOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["Business", "Individual"].map(t => (
                                                    <div key={t} onClick={() => { setCustomerType(t); setIsCustTypeOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{t}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">First Name</label>
                                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Email</label>
                                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Phone</label>
                                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Notes</label>
                                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Display Name</label>
                                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Company Name</label>
                                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Last Name</label>
                                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={custStatusRef}>
                                        <div onClick={() => setIsCustStatusOpen(!isCustStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span>{custStatus}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {isCustStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["All", "Active", "Inactive"].map(s => (
                                                    <div key={s} onClick={() => { setCustStatus(s); setIsCustStatusOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{s}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Address</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none" />
                                </div>
                            </div>

                            {/* Dynamic Reporting Tags Area - Bottom Spanning 2 Columns */}
                            <div className="col-span-2 grid grid-cols-2 gap-x-12 gap-y-5 pt-2">
                                {reportingTags.map((tag, idx) => {
                                    const isBottomRow = idx >= reportingTags.length - 2;
                                    return (
                                        <div key={tag.id} className="flex items-center gap-4 relative" style={{ zIndex: 80 - Math.floor(idx/2) }}>
                                            <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={tag.name}>{tag.name}</label>
                                            <div className="flex-1 relative" ref={el => tagRefs.current[tag.id] = el}>
                                                <div onClick={() => setOpenTagId(openTagId === tag.id ? null : tag.id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                                    <span className={tagValues[tag.id] ? "text-gray-900" : "text-gray-400"}>
                                                        {tagValues[tag.id] || "Select a value"}
                                                    </span>
                                                    <ChevronDown size={14} className="text-gray-400" />
                                                </div>
                                                {openTagId === tag.id && (
                                                    <div className={`absolute ${isBottomRow ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-56 overflow-y-auto py-1`}>
                                                        {(tag.options || []).map((opt: string) => (
                                                            <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [tag.id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : searchType === "Products" ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Product Name</label>
                                    <input 
                                        type="text" 
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9"
                                    />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={productStatusRef}>
                                        <div 
                                            onClick={() => setIsProductStatusOpen(!isProductStatusOpen)}
                                            className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white"
                                        >
                                            <span>{productStatus}</span>
                                            <ChevronDown size={14} className={`text-[#1e5e6e] transition-transform ${isProductStatusOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isProductStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1 flex flex-col">
                                                <div className="px-3 py-2 border-b border-gray-100">
                                                    <div className="relative flex items-center">
                                                        <Search size={14} className="absolute left-2.5 text-gray-400" />
                                                        <input 
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            value={productStatusSearch}
                                                            onChange={(e) => setProductStatusSearch(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#1e5e6e]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="py-1">
                                                    {["All", "Active", "Inactive"]
                                                        .filter(s => s.toLowerCase().includes(productStatusSearch.toLowerCase()))
                                                        .map(s => (
                                                            <div 
                                                                key={s}
                                                                onClick={() => { setProductStatus(s); setIsProductStatusOpen(false); setProductStatusSearch(""); }}
                                                                className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${productStatus === s ? 'text-[#1e5e6e] font-medium' : 'text-gray-700'}`}
                                                            >
                                                                <span>{s}</span>
                                                                {productStatus === s && <div className="w-1.5 h-1.5 rounded-full bg-[#1e5e6e]" />}
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : searchType === "Items" ? (
                        <>
                            {/* Row 1 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Item Name</label>
                                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">SKU</label>
                                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 2 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Description</label>
                                <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Rate</label>
                                <input type="text" value={itemRate} onChange={(e) => setItemRate(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 3 */}
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                <div className="flex-1 relative" ref={itemStatusRef}>
                                    <div onClick={() => setIsItemStatusOpen(!isItemStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span>{itemStatus}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isItemStatusOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["All", "Active", "Inactive"].map(s => (
                                                <div key={s} onClick={() => { setItemStatus(s); setIsItemStatusOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Sales Tax</label>
                                <div className="flex-1 relative" ref={salesTaxRef}>
                                    <div onClick={() => setIsSalesTaxOpen(!isSalesTaxOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span className={salesTax ? "text-gray-900" : "text-gray-400"}>{salesTax || "Select a Tax"}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isSalesTaxOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["Tax 1", "Tax 2"].map(t => (
                                                <div key={t} onClick={() => { setSalesTax(t); setIsSalesTaxOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{t}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 4 */}
                            <div className="flex items-center gap-4 relative z-[90]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Sales Account</label>
                                <div className="flex-1 relative" ref={salesAccountRef}>
                                    <div onClick={() => setIsSalesAccountOpen(!isSalesAccountOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span className={salesAccount ? "text-gray-900" : "text-gray-400"}>{salesAccount || "Select an Account"}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isSalesAccountOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1 max-h-48 overflow-y-auto">
                                            {["Account 1", "Account 2"].map(a => (
                                                <div key={a} onClick={() => { setSalesAccount(a); setIsSalesAccountOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{a}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* integrated reporting tags for Items */}
                            {reportingTags.length > 0 && (
                                <div key={reportingTags[0].id} className="flex items-center gap-4 relative z-[90]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={reportingTags[0].name}>{reportingTags[0].name}</label>
                                    <div className="flex-1 relative" ref={el => tagRefs.current[reportingTags[0].id] = el}>
                                        <div onClick={() => setOpenTagId(openTagId === reportingTags[0].id ? null : reportingTags[0].id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span className={tagValues[reportingTags[0].id] ? "text-gray-900" : "text-gray-400"}>{tagValues[reportingTags[0].id] || "Select a value"}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {openTagId === reportingTags[0].id && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-48 overflow-y-auto py-1">
                                                {(reportingTags[0].options || []).map((opt: string) => (
                                                    <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [reportingTags[0].id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Row 5 */}
                            {reportingTags.slice(1, 3).map((tag, idx) => (
                                <div key={tag.id} className="flex items-center gap-4 relative z-[85]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={tag.name}>{tag.name}</label>
                                    <div className="flex-1 relative" ref={el => tagRefs.current[tag.id] = el}>
                                        <div onClick={() => setOpenTagId(openTagId === tag.id ? null : tag.id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span className={tagValues[tag.id] ? "text-gray-900" : "text-gray-400"}>{tagValues[tag.id] || "Select a value"}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {openTagId === tag.id && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-48 overflow-y-auto py-1">
                                                {(tag.options || []).map((opt: string) => (
                                                    <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [tag.id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : searchType === "Plans" ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Plan Name</label>
                                    <input 
                                        type="text" 
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9"
                                    />
                                </div>
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Plan Code</label>
                                    <input 
                                        type="text" 
                                        value={planCode}
                                        onChange={(e) => setPlanCode(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9"
                                    />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={planStatusRef}>
                                        <div 
                                            onClick={() => setIsPlanStatusOpen(!isPlanStatusOpen)}
                                            className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white"
                                        >
                                            <span>{planStatus}</span>
                                            <ChevronDown size={14} className={`text-[#1e5e6e] transition-transform ${isPlanStatusOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isPlanStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1 flex flex-col">
                                                <div className="px-3 py-2 border-b border-gray-100">
                                                    <div className="relative flex items-center">
                                                        <Search size={14} className="absolute left-2.5 text-gray-400" />
                                                        <input 
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            value={planStatusSearch}
                                                            onChange={(e) => setPlanStatusSearch(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#1e5e6e]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="py-1">
                                                    {["All", "Active", "Inactive"]
                                                        .filter(s => s.toLowerCase().includes(planStatusSearch.toLowerCase()))
                                                        .map(s => (
                                                            <div 
                                                                key={s}
                                                                onClick={() => { setPlanStatus(s); setIsPlanStatusOpen(false); setPlanStatusSearch(""); }}
                                                                className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${planStatus === s ? 'text-[#1e5e6e] font-medium' : 'text-gray-700'}`}
                                                            >
                                                                <span>{s}</span>
                                                                {planStatus === s && <div className="w-1.5 h-1.5 rounded-full bg-[#1e5e6e]" />}
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : ["Invoices", "Quotes", "Retainer Invoices", "Sales Receipts", "Credit Notes", "Payment Links", "Payments Received"].includes(searchType) ? (
                        <>
                            {/* Row 1 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">{searchType.replace(/s$/, '').replace('Invoices', 'Invoice').replace('Receipts', 'Receipt').replace('Links', 'Link').replace('Received', 'Payment')} Number</label>
                                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Reference Number</label>
                                <input type="text" value={invoiceReference} onChange={(e) => setInvoiceReference(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 2 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Customer</label>
                                <input type="text" value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" placeholder="Enter customer name" />
                            </div>
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                <div className="flex-1 relative" ref={invoiceStatusRef}>
                                    <div onClick={() => setIsInvoiceStatusOpen(!isInvoiceStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span>{invoiceStatus}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isInvoiceStatusOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["All", "Draft", "Sent", "Paid", "Overdue", "Void"].map(s => (
                                                <div key={s} onClick={() => { setInvoiceStatus(s); setIsInvoiceStatusOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 3 - Dates */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Date From</label>
                                <input type="date" value={invoiceDateStart} onChange={(e) => setInvoiceDateStart(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Date To</label>
                                <input type="date" value={invoiceDateEnd} onChange={(e) => setInvoiceDateEnd(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 4 - Amount */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Min Amount</label>
                                <input type="number" value={invoiceAmountMin} onChange={(e) => setInvoiceAmountMin(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Max Amount</label>
                                <input type="number" value={invoiceAmountMax} onChange={(e) => setInvoiceAmountMax(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 5 - integrated reporting tags */}
                            {reportingTags.slice(0, 2).map((tag, idx) => (
                                <div key={tag.id} className="flex items-center gap-4 relative z-[85]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={tag.name}>{tag.name}</label>
                                    <div className="flex-1 relative" ref={el => tagRefs.current[tag.id] = el}>
                                        <div onClick={() => setOpenTagId(openTagId === tag.id ? null : tag.id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span className={tagValues[tag.id] ? "text-gray-900" : "text-gray-400"}>{tagValues[tag.id] || "Select a value"}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {openTagId === tag.id && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-48 overflow-y-auto py-1">
                                                {(tag.options || []).map((opt: string) => (
                                                    <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [tag.id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : ["Expenses", "Recurring Expenses"].includes(searchType) ? (
                        <>
                            {/* Row 1 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Reference#</label>
                                <input type="text" value={expenseReference} onChange={(e) => setExpenseReference(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Vendor Name</label>
                                <input type="text" value={expenseVendor} onChange={(e) => setExpenseVendor(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 2 */}
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Expense Account</label>
                                <div className="flex-1 relative" ref={expenseAccountRef}>
                                    <div onClick={() => setIsExpenseAccountOpen(!isExpenseAccountOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span className={expenseAccount ? "text-gray-900" : "text-gray-400"}>{expenseAccount || "Select an Account"}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isExpenseAccountOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1 max-h-48 overflow-y-auto">
                                            {["Advertising", "Travel", "Meals", "Software", "Rent"].map(a => (
                                                <div key={a} onClick={() => { setExpenseAccount(a); setIsExpenseAccountOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{a}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                <div className="flex-1 relative" ref={expenseStatusRef}>
                                    <div onClick={() => setIsExpenseStatusOpen(!isExpenseStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span>{expenseStatus}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isExpenseStatusOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["All", "Billable", "Non-Billable", "Invoiced", "Reimbursed"].map(s => (
                                                <div key={s} onClick={() => { setExpenseStatus(s); setIsExpenseStatusOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 3 - Dates */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">From Date</label>
                                <input type="date" value={expenseDateStart} onChange={(e) => setExpenseDateStart(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">To Date</label>
                                <input type="date" value={expenseDateEnd} onChange={(e) => setExpenseDateEnd(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 4 - Amount */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Min Amount</label>
                                <input type="number" value={expenseAmountMin} onChange={(e) => setExpenseAmountMin(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Max Amount</label>
                                <input type="number" value={expenseAmountMax} onChange={(e) => setExpenseAmountMax(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>

                            {/* Row 5 - integrated reporting tags */}
                            {reportingTags.slice(0, 2).map((tag, idx) => (
                                <div key={tag.id} className="flex items-center gap-4 relative z-[85]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right truncate" title={tag.name}>{tag.name}</label>
                                    <div className="flex-1 relative" ref={el => tagRefs.current[tag.id] = el}>
                                        <div onClick={() => setOpenTagId(openTagId === tag.id ? null : tag.id)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span className={tagValues[tag.id] ? "text-gray-900" : "text-gray-400"}>{tagValues[tag.id] || "Select a value"}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {openTagId === tag.id && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] max-h-48 overflow-y-auto py-1">
                                                {(tag.options || []).map((opt: string) => (
                                                    <div key={opt} onClick={() => { setTagValues(prev => ({ ...prev, [tag.id]: opt })); setOpenTagId(null); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : searchType === "Projects" ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Project Name</label>
                                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                                </div>
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={projectStatusRef}>
                                        <div onClick={() => setIsProjectStatusOpen(!isProjectStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span>{projectStatus}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {isProjectStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["All", "Active", "Archived", "Finished"].map(s => (
                                                    <div key={s} onClick={() => { setProjectStatus(s); setIsProjectStatusOpen(false); }} className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${projectStatus === s ? 'text-[#1e5e6e]' : ''}`}>{s}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Customer</label>
                                    <input type="text" value={projectCustomer} onChange={(e) => setProjectCustomer(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                                </div>
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Billing Method</label>
                                    <div className="flex-1 relative" ref={billingMethodRef}>
                                        <div onClick={() => setIsBillingMethodOpen(!isBillingMethodOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span>{billingMethod}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {isBillingMethodOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["All", "Fixed Cost", "Based on Project Hours", "Based on Task Hours", "Based on Staff Hours"].map(m => (
                                                    <div key={m} onClick={() => { setBillingMethod(m); setIsBillingMethodOpen(false); }} className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${billingMethod === m ? 'text-[#1e5e6e]' : ''}`}>{m}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : searchType === "Tasks" ? (
                        <>
                            {/* Row 1 */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Task Name</label>
                                <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Project</label>
                                <input type="text" value={taskProject} onChange={(e) => setTaskProject(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            {/* Row 2 */}
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                <div className="flex-1 relative" ref={taskStatusRef}>
                                    <div onClick={() => setIsTaskStatusOpen(!isTaskStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span>{taskStatus}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isTaskStatusOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["All", "Open", "Closed"].map(s => (
                                                <div key={s} onClick={() => { setTaskStatus(s); setIsTaskStatusOpen(false); }} className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${taskStatus === s ? 'text-[#1e5e6e]' : ''}`}>{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : ["Timesheet", "Timesheet Customer Approval", "Timesheet Approval", "Events"].includes(searchType) ? (
                        <>
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 relative">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">{searchType === 'Events' ? 'Event Name' : 'Project'}</label>
                                    <input type="text" value={timesheetProject} onChange={(e) => setTimesheetProject(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                                </div>
                                {searchType !== 'Events' && (
                                    <div className="flex items-center gap-4 relative">
                                        <label className="w-[130px] text-[13px] text-gray-600 text-right">Task</label>
                                        <input type="text" value={timesheetTask} onChange={(e) => setTimesheetTask(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                                    </div>
                                )}
                            </div>
                            {/* Column 2 */}
                            <div className="space-y-5">
                                {searchType !== 'Events' && (
                                    <div className="flex items-center gap-4 relative">
                                        <label className="w-[130px] text-[13px] text-gray-600 text-right">Staff</label>
                                        <input type="text" value={timesheetStaff} onChange={(e) => setTimesheetStaff(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                                    </div>
                                )}
                                <div className="flex items-center gap-4 relative z-[95]">
                                    <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                    <div className="flex-1 relative" ref={timesheetStatusRef}>
                                        <div onClick={() => setIsTimesheetStatusOpen(!isTimesheetStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                            <span>{timesheetStatus}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {isTimesheetStatusOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                                {["All", "Approved", "Pending", "Rejected"].map(s => (
                                                    <div key={s} onClick={() => { setTimesheetStatus(s); setIsTimesheetStatusOpen(false); }} className={`px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer ${timesheetStatus === s ? 'text-[#1e5e6e]' : ''}`}>{s}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Row 3 - Dates */}
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">From Date</label>
                                <input type="date" value={timesheetDateStart} onChange={(e) => setTimesheetDateStart(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">To Date</label>
                                <input type="date" value={timesheetDateEnd} onChange={(e) => setTimesheetDateEnd(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                        </>
                    ) : ["Price Lists", "Pricing Widgets"].includes(searchType) ? (
                        <>
                            <div className="flex items-center gap-4 relative">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Name</label>
                                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="flex-1 border border-gray-300 rounded-[4px] px-3 h-9 text-sm focus:border-[#1e5e6e] outline-none h-9" />
                            </div>
                            <div className="flex items-center gap-4 relative z-[95]">
                                <label className="w-[130px] text-[13px] text-gray-600 text-right">Status</label>
                                <div className="flex-1 relative" ref={itemStatusRef}>
                                    <div onClick={() => setIsItemStatusOpen(!isItemStatusOpen)} className="w-full h-9 flex items-center justify-between border border-gray-300 rounded-[4px] px-3 text-sm cursor-pointer bg-white">
                                        <span>{itemStatus}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </div>
                                    {isItemStatusOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[110] py-1">
                                            {["All", "Active", "Inactive"].map(s => (
                                                <div key={s} onClick={() => { setItemStatus(s); setIsItemStatusOpen(false); }} className="px-4 py-2 text-sm hover:bg-[#f0f7f7] cursor-pointer">{s}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center text-gray-400 italic gap-4">
                            <p>Search criteria for {searchType} coming soon...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-3 px-8 py-6 border-t border-gray-100 bg-gray-50/30">
                    <button 
                        onClick={handleSearch}
                        className="px-10 py-2 bg-[#1e5e6e] text-white text-sm font-semibold rounded-md hover:bg-[#164a58] transition-colors shadow-sm"
                    >
                        Search
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-10 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-md hover:bg-white transition-colors bg-white shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}