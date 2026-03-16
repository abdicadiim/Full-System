import React, { useState, useEffect } from "react";
import { X, FileText, CheckCircle, Info } from "lucide-react";
import { invoicesAPI } from "../../../../services/api";
import { Invoice } from "../../salesModel";

interface ApplyToInvoicesProps {
    isOpen: boolean;
    onClose: () => void;
    creditNote: any; // Using any for now to match the flexible typing in the project
    onSave: (allocations: any[]) => Promise<void>;
}

const ApplyToInvoices: React.FC<ApplyToInvoicesProps> = ({ isOpen, onClose, creditNote, onSave }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [appliedAmounts, setAppliedAmounts] = useState<{ [key: string]: number }>({});
    const [isDateToggleEnabled, setIsDateToggleEnabled] = useState(true);
    const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

    const normalizeStatus = (status: any) =>
        String(status || "")
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const getRawInvoiceStatus = (invoice: any): string => {
        const directStatus = invoice?.status;
        if (typeof directStatus === "string") return directStatus;
        if (directStatus && typeof directStatus === "object") {
            const nestedStatus =
                directStatus.value ??
                directStatus.label ??
                directStatus.name ??
                directStatus.status;
            if (typeof nestedStatus === "string") return nestedStatus;
        }

        const fallbackStatuses = [invoice?.invoiceStatus, invoice?.paymentStatus, invoice?.statusText];
        for (const fallback of fallbackStatuses) {
            if (typeof fallback === "string" && fallback.trim()) return fallback;
        }

        return "";
    };

    const getNormalizedInvoiceStatus = (invoice: any): string => normalizeStatus(getRawInvoiceStatus(invoice));

    const getDisplayInvoiceStatus = (invoice: any): string => {
        const rawStatus = getRawInvoiceStatus(invoice);
        return rawStatus ? rawStatus.replace(/_/g, " ").toUpperCase() : "OPEN";
    };

    const getInvoiceOutstandingBalance = (invoice: any): number => {
        const computed = Number(invoice?.total || 0) - Number(invoice?.paidAmount ?? invoice?.amountPaid ?? 0);
        const rawBalance =
            invoice?.balance ??
            invoice?.balanceDue ??
            computed;
        const numericBalance = Number(rawBalance);
        if (!Number.isFinite(numericBalance)) return 0;
        return Math.max(0, numericBalance);
    };

    const isInvoiceEligibleForCredit = (invoice: any): boolean => {
        const status = getNormalizedInvoiceStatus(invoice);
        const balance = getInvoiceOutstandingBalance(invoice);
        if (balance <= 0) return false;
        return !["draft", "void", "paid", "closed", "cancelled"].includes(status);
    };

    // Fetch unpaid invoices when modal opens
    useEffect(() => {
        const custId = creditNote?.customerId || creditNote?.customer?._id || creditNote?.customer?.id || (typeof creditNote?.customer === 'string' ? creditNote.customer : null);
        if (isOpen && custId) {
            const fetchInvoices = async () => {
                setLoading(true);
                try {
                    // Fetch invoices for the customer, excluding drafts
                    const response = await invoicesAPI.getAll({
                        customerId: custId,
                        status_ne: 'draft,paid,void,closed,cancelled'
                    });

                    if (response && response.data) {
                        // Include only invoices that can actually receive credits.
                        const allCustomerInvoices = response.data
                            .filter((inv: any) => isInvoiceEligibleForCredit(inv))
                            .map((inv: any) => ({
                                ...inv,
                                id: String(inv.id || inv._id || inv.invoiceId || "")
                            }))
                            .filter((inv: any) => !!inv.id);
                        setInvoices(allCustomerInvoices);
                        setAppliedAmounts({});
                    }
                } catch (error) {
                    console.error("Error fetching invoices:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchInvoices();
        }
    }, [isOpen, creditNote]);

    // Calculate totals
    const totalCredits = creditNote?.total || creditNote?.amount || 0;
    // Use balance if available. If balance is explicitly provided (even 0), trust it.
    // Otherwise fallback to total - creditUsed logic (though creditsUsed seems unreliable in current backend).
    const availableCredits = (creditNote?.balance !== undefined && creditNote?.balance !== null)
        ? creditNote.balance
        : Math.max(0, totalCredits - (creditNote?.creditsUsed || 0));

    const totalApplied = Object.values(appliedAmounts).reduce((sum, val) => sum + val, 0);
    // Allow negative values to show user they exceeded the limit (though strict clamping below prevents it now)
    const remainingCredits = availableCredits - totalApplied;

    const handleAmountChange = (invoiceId: string, value: string, maxBalance: number) => {
        let numValue = parseFloat(value) || 0;

        // Calculate what is applied to *other* invoices
        const currentAmount = appliedAmounts[invoiceId] || 0;
        const otherApplied = totalApplied - currentAmount;

        // Calculate how much is actually available for THIS invoice
        const availableForThis = availableCredits - otherApplied;

        // Strict Clamping:
        // 1. Cannot be negative
        // 2. Cannot exceed Invoice Balance
        // 3. Cannot exceed Available Credits (user request: "if greater than do not allow it")

        if (numValue < 0) numValue = 0;

        const absoluteMax = Math.max(0, Math.min(maxBalance, availableForThis));

        if (numValue > absoluteMax) {
            numValue = absoluteMax;
        }

        setAppliedAmounts(prev => ({
            ...prev,
            [invoiceId]: numValue
        }));
    };

    const handlePayInFull = (invoiceId: string, balance: number) => {
        const otherApplied = totalApplied - (appliedAmounts[invoiceId] || 0);
        const availableForThis = Math.max(0, availableCredits - otherApplied);
        const amountToApply = Math.min(balance, availableForThis);

        setAppliedAmounts(prev => ({
            ...prev,
            [invoiceId]: amountToApply
        }));
    };

    const handleClearApplied = () => {
        setAppliedAmounts({});
    };

    const handleSave = async () => {
        // Validate
        if (totalApplied > availableCredits) {
            alert("Amount applied exceeds available credits.");
            return;
        }

        setSaving(true);
        try {
            // Construct allocations array
            const allocations = Object.entries(appliedAmounts)
                .filter(([_, amount]) => amount > 0)
                .map(([invoiceId, amount]) => ({
                    invoiceId,
                    amount,
                    date: appliedDate
                }));

            await onSave(allocations);
            onClose();
        } catch (error) {
            console.error("Error applying credits:", error);
            alert("Failed to apply credits. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        const currency = creditNote?.currency || "USD"; // Default
        // Simple formatter matching the style
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    {/* Header */}
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Apply Credits to Invoices
                            </h3>
                            <button
                                type="button"
                                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                onClick={onClose}
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50/50">
                        {/* Info Cards */}
                        <div className="flex items-center space-x-6 mb-6">
                            {/* Credit Note Number Badge */}
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                                    <FileText size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium uppercase">Credit Note#</span>
                                    <span className="text-sm font-bold text-gray-900">{creditNote?.creditNoteNumber}</span>
                                </div>
                            </div>

                            {/* Separator line maybe? No, just space */}

                            {/* Available Credits Badge */}
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-[#156372]/10 flex items-center justify-center text-[#156372]">
                                    <CheckCircle size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium">Available Credits</span>
                                    <div className="flex items-center space-x-1">
                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(availableCredits)}</span>
                                        {/* Assuming "Apply Credits to Invoices" is just static text or link in the design? It looks like a link or status text. I'll just keep it simple text or link color. */}
                                        <span className="text-xs text-blue-500 font-medium cursor-pointer">Apply Credits to Invoices</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoices Section Header */}
                        <div className="flex justify-between items-end mb-4">
                            <h4 className="text-sm font-bold text-gray-800">Customer Invoices</h4>
                            <div className="flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">Set Applied on Date</span>
                                    <Info size={14} className="text-gray-400" />
                                    {/* Toggle Switch */}
                                    <button
                                        type="button"
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${isDateToggleEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                        onClick={() => setIsDateToggleEnabled(!isDateToggleEnabled)}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isDateToggleEnabled ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                    </button>
                                </div>
                                {isDateToggleEnabled && (
                                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                                        <span>As on</span>
                                        <strong className="text-gray-900">{formatDate(appliedDate)}</strong>,
                                        {/* Mock exchange rate text from image */}
                                        <span>1 {creditNote?.currency || 'AUD'} = 1 {creditNote?.currency || 'CAD'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Clear Amount Action */}
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={handleClearApplied}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                            >
                                Clear Applied Amount
                            </button>
                        </div>

                        {/* Table */}
                        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Credits to Apply</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                                                Loading invoices...
                                            </td>
                                        </tr>
                                    ) : invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                                                No unpaid invoices found for this customer.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((invoice, index) => {
                                            const balance = getInvoiceOutstandingBalance(invoice);
                                            const invoiceStatus = getNormalizedInvoiceStatus(invoice);
                                            const amount = appliedAmounts[invoice.id] || 0;
                                            return (
                                                <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                        {invoice.invoiceNumber}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(invoice.date || invoice.invoiceDate || "")}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                        <span className={`px-2 py-1 rounded-full font-semibold uppercase ${invoiceStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                                            invoiceStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                invoiceStatus === 'partially paid' || invoiceStatus === 'partially_paid' || invoiceStatus === 'partial' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {getDisplayInvoiceStatus(invoice)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                                        {formatCurrency(Number(invoice.total || 0))}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">
                                                        {formatCurrency(balance)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex flex-col items-end space-y-1">
                                                            <input
                                                                type="number"
                                                                value={amount === 0 ? '' : amount}
                                                                onChange={(e) => handleAmountChange(invoice.id, e.target.value, balance)}
                                                                disabled={balance <= 0}
                                                                className={`w-32 px-3 py-2 text-right border ${balance <= 0 ? 'bg-gray-100 cursor-not-allowed border-gray-200' : amount > balance ? 'border-red-500 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'} rounded-md text-sm focus:outline-none focus:ring-1 transition-shadow`}
                                                                placeholder="0.00"
                                                            />
                                                            {balance > 0 && (
                                                                <button
                                                                    onClick={() => handlePayInFull(invoice.id, balance)}
                                                                    className="text-xs text-blue-500 hover:text-blue-700 font-medium hover:underline"
                                                                >
                                                                    Pay in Full
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Summary */}
                        <div className="mt-6 flex justify-end">
                            <div className="w-80 bg-gray-50 rounded-lg p-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">Credits Applied:</span>
                                    <span className="text-sm font-medium text-gray-900">{formatCurrency(totalApplied)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={`text-gray-600 ${remainingCredits < 0 ? 'text-red-500' : ''}`}>Remaining Credits:</span>
                                    <span className={`font-bold ${remainingCredits < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(remainingCredits)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${saving || totalApplied === 0 || remainingCredits < 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleSave}
                            disabled={saving || totalApplied === 0 || remainingCredits < 0}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyToInvoices;
