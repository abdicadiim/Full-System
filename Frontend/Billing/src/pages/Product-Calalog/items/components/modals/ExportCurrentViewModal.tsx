
import React, { useState } from "react";
import { X, Info, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

interface ExportCurrentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    columns: any[];
    accounts?: any[];
}

const ExportCurrentViewModal = ({ isOpen, onClose, data, columns, accounts = [] }: ExportCurrentViewModalProps) => {
    if (!isOpen) return null;

    const [fileFormat, setFileFormat] = useState("csv");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState("");

    // Helper function to get the display value for a column
    const getColumnValue = (item: any, colKey: string): string => {
        switch (colKey) {
            case 'purchaseRate':
                return (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.costPrice || 0)));
            case 'rate':
                return (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.sellingPrice || 0)));
            case 'stockQuantity':
                if (item.trackInventory) {
                    const val = parseFloat(String(item.stockQuantity ?? item.stockOnHand ?? 0));
                    return isNaN(val) ? "0.00" : val.toFixed(2);
                }
                return "";
            case 'accountName': {
                const accId = item.salesAccount || item.accountID;
                const acc = accounts.find(a => (a._id || a.id) === accId);
                return acc?.accountName || item.salesAccountName || item.accountName || "-";
            }
            case 'purchaseAccountName': {
                const accId = item.purchaseAccount;
                const acc = accounts.find(a => (a._id || a.id) === accId);
                return acc?.accountName || item.purchaseAccountName || item.purchaseAccountName || "-";
            }
            default: {
                const val = item[colKey] || item[colKey === 'purchaseDescription' ? 'purchaseDescription' : colKey === 'description' ? 'salesDescription' : colKey];
                if (val === null || val === undefined || val === "") return "-";
                if (typeof val === "boolean") return val ? "Yes" : "No";
                return String(val);
            }
        }
    };

    const handleExport = () => {
        try {
            if (!data || data.length === 0) {
                toast.error("No data to export");
                return;
            }

            // Prepare headers
            const headers = columns.map(col => col.label);

            // Prepare rows using the helper function
            const rows = data.map(item => {
                return columns.map(col => getColumnValue(item, col.key));
            });

            if (fileFormat === "csv") {
                // CSV Export
                const csvHeaders = headers.map(h => `"${h}"`).join(",");
                const csvRows = rows.map(row =>
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                ).join("\n");

                const csvContent = `${csvHeaders}\n${csvRows}`;
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);

                link.setAttribute("href", url);
                link.setAttribute("download", `items_current_view_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                // XLS/XLSX Export (HTML table format)
                let xlsContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                xlsContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Items</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                xlsContent += '<body><table>';

                // Add headers
                xlsContent += '<tr>';
                headers.forEach(header => {
                    xlsContent += `<th>${header}</th>`;
                });
                xlsContent += '</tr>';

                // Add data rows
                rows.forEach(row => {
                    xlsContent += '<tr>';
                    row.forEach(cell => {
                        xlsContent += `<td>${cell}</td>`;
                    });
                    xlsContent += '</tr>';
                });

                xlsContent += '</table></body></html>';

                const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                const extension = fileFormat === "xlsx" ? "xlsx" : "xls";

                link.setAttribute("href", url);
                link.setAttribute("download", `items_current_view_${new Date().toISOString().split('T')[0]}.${extension}`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            toast.success(`Exported ${data.length} items`);
            onClose();
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export items");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-4 px-6 pb-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-slate-800">Export Current View</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={24} className="border border-slate-200 rounded p-0.5 hover:border-red-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex items-start gap-3 mb-6">
                        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700">
                            Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format.
                        </p>
                    </div>

                    <div className="space-y-6">

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
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">CSV (Comma Separated Value)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        checked={fileFormat === "xls"}
                                        onChange={() => setFileFormat("xls")}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                                <span className="font-bold">Note:</span> You can export only the first 10,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it. <a href="#" className="text-blue-500 hover:underline">Backup Your Data</a>
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

export default ExportCurrentViewModal;

