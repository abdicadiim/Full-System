import React, { useState } from "react";
import { X, Info, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

interface ExportItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    accounts?: any[];
}

const ExportItemsModal = ({ isOpen, onClose, data, accounts = [] }: ExportItemsModalProps) => {
    if (!isOpen) return null;

    const [module, setModule] = useState("Items");
    const [period, setPeriod] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [fileFormat, setFileFormat] = useState("csv");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState("");

    const handleExport = () => {
        if (module !== "Items") {
            toast("Only Items export is currently supported.", { icon: "ℹ️" });
        }

        let exportData = [...(data || [])];

        // Date Filtering
        if (period === "specific" && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // End of day

            exportData = exportData.filter(item => {
                const itemDate = new Date(item.createdAt || item.date || item.created_time || item.updatedAt);
                return itemDate >= start && itemDate <= end;
            });
        }

        if (exportData.length === 0) {
            toast.error("No data to export for the selected criteria.");
            return;
        }

        const headers = [
            "Item ID", "Item Name", "SKU", "Description", "Rate", "Account", "Account Code",
            "Product Type", "Source", "Reference", "Last Sync", "Status", "Usage unit",
            "Unit Name", "Purchase Description", "Purchase Rate", "Purchase Account",
            "Purchase Account Code", "Inventory Asset Account", "Reorder Point", "Vendor",
            "Opening Stock", "Opening Stock Value", "Stock On Hand", "Item Type",
            "Sellable", "Purchasable", "Track Inventory"
        ];

        try {
            const rows = exportData.map(item => {
                return headers.map(header => {
                    switch (header) {
                        case "Item ID": return String(item.id || item._id || "");
                        case "Item Name": return String(item.name || "");
                        case "SKU": return String(item.sku || "");
                        case "Description": return String(item.description || item.salesDescription || "");
                        case "Rate": return (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.sellingPrice || 0)));
                        case "Account": {
                            const acc = accounts.find(a => (a._id || a.id) === (item.salesAccount || item.accountID));
                            return acc?.accountName || item.salesAccountName || item.accountName || "";
                        }
                        case "Account Code": {
                            const acc = accounts.find(a => (a._id || a.id) === (item.salesAccount || item.accountID));
                            return acc?.accountCode || "";
                        }
                        case "Product Type": return String(item.productType || (item.trackInventory ? "goods" : "service"));
                        case "Source": return "1";
                        case "Status": return item.active ? "Active" : "Inactive";
                        case "Usage unit": return String(item.unit || "");
                        case "Unit Name": return String(item.unit || "");
                        case "Purchase Description": return String(item.purchaseDescription || "");
                        case "Purchase Rate": return (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.costPrice || 0)));
                        case "Purchase Account": {
                            const acc = accounts.find(a => (a._id || a.id) === item.purchaseAccount);
                            return acc?.accountName || item.purchaseAccountName || "";
                        }
                        case "Purchase Account Code": {
                            const acc = accounts.find(a => (a._id || a.id) === item.purchaseAccount);
                            return acc?.accountCode || "";
                        }
                        case "Inventory Asset Account": {
                            const acc = accounts.find(a => (a._id || a.id) === item.inventoryAccount);
                            return acc?.accountName || item.inventoryAccountName || "";
                        }
                        case "Reorder Point": return String(item.reorderPoint || 0);
                        case "Vendor": return String(item.vendor || "");
                        case "Opening Stock": return String(item.openingStock || 0);
                        case "Opening Stock Value": return String(item.openingStockValue || 0);
                        case "Stock On Hand": return (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.stockQuantity ?? item.stockOnHand ?? 0)));
                        case "Item Type": return String(item.type || "Inventory");
                        case "Sellable": return item.sellable === false ? "FALSE" : "TRUE";
                        case "Purchasable": return item.purchasable === false ? "FALSE" : "TRUE";
                        case "Track Inventory": return item.trackInventory === false ? "FALSE" : "TRUE";
                        default: return "";
                    }
                });
            });

            if (fileFormat === "csv") {
                const csvHeaders = headers.map(h => `"${h}"`).join(",");
                const csvRows = rows.map(row =>
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                ).join("\n");
                const csvContent = `${csvHeaders}\n${csvRows}`;
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `items_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                let xlsContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                xlsContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Items</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                xlsContent += '<body><table>';
                xlsContent += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
                rows.forEach(row => {
                    xlsContent += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
                });
                xlsContent += '</table></body></html>';
                const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                const extension = fileFormat === "xlsx" ? "xlsx" : "xls";
                link.setAttribute("href", url);
                link.setAttribute("download", `items_export_${new Date().toISOString().split('T')[0]}.${extension}`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            toast.success(`Exported ${exportData.length} items`);
            onClose();

        } catch (e) {
            console.error("Export Error", e);
            toast.error("Failed to generate export");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-4 px-6 pb-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-slate-800">Export Items</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex items-start gap-3 mb-6">
                        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700">
                            You can export your data from Zoho Books in CSV, XLS or XLSX format.
                        </p>
                    </div>

                    <div className="space-y-6">

                        {/* Module Selection */}
                        <div>
                            <label className="block text-sm font-medium text-red-500 mb-1">Module*</label>
                            <select
                                value={module}
                                onChange={(e) => setModule(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            >
                                <optgroup label="Sales">
                                    <option value="Quotes">Quotes</option>
                                    <option value="Invoices">Invoices</option>
                                    <option value="Invoice Payments">Invoice Payments</option>
                                    <option value="Recurring Invoices">Recurring Invoices</option>
                                    <option value="Credit Notes">Credit Notes</option>
                                    <option value="Credit Notes Applied to Invoices">Credit Notes Applied to Invoices</option>
                                    <option value="Refunds">Refunds</option>
                                </optgroup>
                                <optgroup label="Purchase">
                                    <option value="Expenses">Expenses</option>
                                    <option value="Recurring Expenses">Recurring Expenses</option>
                                    <option value="Purchase Orders">Purchase Orders</option>
                                    <option value="Bills">Bills</option>
                                    <option value="Bill Payments">Bill Payments</option>
                                    <option value="Recurring Bills">Recurring Bills</option>
                                    <option value="Vendor Credits">Vendor Credits</option>
                                    <option value="Applied Vendor Credits">Applied Vendor Credits</option>
                                    <option value="Vendor Credit Refunds">Vendor Credit Refunds</option>
                                </optgroup>
                                <optgroup label="Time Tracking">
                                    <option value="Projects">Projects</option>
                                    <option value="Timesheet">Timesheet</option>
                                    <option value="Project Tasks">Project Tasks</option>
                                </optgroup>
                                <optgroup label="Others">
                                    <option value="Customers">Customers</option>
                                    <option value="Vendors">Vendors</option>
                                    <option value="Tasks">Tasks</option>
                                    <option value="Items">Items</option>
                                    <option value="Inventory Adjustments">Inventory Adjustments</option>
                                    <option value="Exchange Rates">Exchange Rates</option>
                                    <option value="Users">Users</option>
                                    <option value="Chart of Accounts">Chart of Accounts</option>
                                    <option value="Manual Journals">Manual Journals</option>
                                    <option value="Documents">Documents</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Period Selection */}
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="period"
                                    checked={period === "all"}
                                    onChange={() => setPeriod("all")}
                                    className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                                />
                                <span className="text-sm text-slate-700">All Items</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="period"
                                    checked={period === "specific"}
                                    onChange={() => setPeriod("specific")}
                                    className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                                />
                                <span className="text-sm text-slate-700">Specific Period</span>
                            </label>

                            {period === "specific" && (
                                <div className="flex items-center gap-2 mt-1 ml-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] text-slate-600 placeholder-slate-400"
                                            placeholder="dd/MM/yyyy"
                                        />
                                    </div>
                                    <span className="text-slate-400">-</span>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] text-slate-600 placeholder-slate-400"
                                            placeholder="dd/MM/yyyy"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Export Template */}
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <label className="text-sm text-slate-600">Export Template</label>
                                <Info size={14} className="text-slate-400" />
                            </div>
                            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]">
                                <option>Select an Export Template</option>
                            </select>
                        </div>

                        {/* Decimal Format */}
                        <div>
                            <label className="block text-sm font-medium text-red-500 mb-1">Decimal Format*</label>
                            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]">
                                <option>1234567.89</option>
                                <option>1,234,567.89</option>
                                <option>1.234.567,89</option>
                            </select>
                        </div>

                        {/* Export File Format */}
                        <div>
                            <label className="block text-sm font-medium text-red-500 mb-2">Export File Format*</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        checked={fileFormat === "csv"}
                                        onChange={() => setFileFormat("csv")}
                                        className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                                    />
                                    <span className="text-sm text-slate-700">CSV (Comma Separated Value)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        checked={fileFormat === "xls"}
                                        onChange={() => setFileFormat("xls")}
                                        className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                                    />
                                    <span className="text-sm text-slate-700">XLS (Microsoft Excel 1997-2004 Compatible)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        checked={fileFormat === "xlsx"}
                                        onChange={() => setFileFormat("xlsx")}
                                        className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                                    />
                                    <span className="text-sm text-slate-700">XLSX (Microsoft Excel)</span>
                                </label>
                            </div>
                        </div>

                        {/* PII Checkbox */}
                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                            />
                            <span className="text-sm text-slate-600">
                                Include Sensitive Personally Identifiable Information (PII) while exporting.
                            </span>
                        </div>

                        {/* Password Protection */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">File Protection Password</label>
                            <div className="relative">
                                <input
                                    type={passwordVisible ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                            </p>
                        </div>

                        {/* Note */}
                        <div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                <span className="font-bold">Note:</span> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it. <a href="#" className="text-blue-500 hover:underline">Backup Your Data</a>
                            </p>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={handleExport}
                        className="px-6 py-2 bg-[#156372] hover:bg-[#11525e] text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                        Export
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-slate-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ExportItemsModal;

