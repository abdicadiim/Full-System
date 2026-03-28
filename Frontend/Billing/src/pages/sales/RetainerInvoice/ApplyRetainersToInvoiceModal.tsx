import React, { useEffect, useMemo, useState } from "react";
import { X, Info, CheckCircle, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { invoicesAPI } from "../../../services/api";

type ApplyRetainersToInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retainerInvoice: any;
  payment?: any;
  onSave: (allocations: { invoiceId: string; amount: number; date: string }[]) => Promise<void>;
};

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
    const nested =
      directStatus.value ?? directStatus.label ?? directStatus.name ?? directStatus.status;
    if (typeof nested === "string") return nested;
  }
  const fallbacks = [invoice?.invoiceStatus, invoice?.paymentStatus, invoice?.statusText];
  for (const fallback of fallbacks) {
    if (typeof fallback === "string" && fallback.trim()) return fallback;
  }
  return "";
};

const getNormalizedInvoiceStatus = (invoice: any): string => normalizeStatus(getRawInvoiceStatus(invoice));

const getInvoiceOutstandingBalance = (invoice: any): number => {
  const computed = Number(invoice?.total || 0) - Number(invoice?.paidAmount ?? invoice?.amountPaid ?? 0);
  const raw =
    invoice?.balance ??
    invoice?.balanceDue ??
    computed;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
};

const getInvoiceId = (invoice: any): string =>
  String(invoice?.id || invoice?._id || "").trim();

const getInvoiceCustomerId = (invoice: any): string =>
  String(
    invoice?.customerId ||
      invoice?.customer?._id ||
      invoice?.customer?.id ||
      (typeof invoice?.customer === "string" ? invoice.customer : "") ||
      ""
  ).trim();

const getInvoiceCustomerName = (invoice: any): string =>
  String(
    invoice?.customerName ||
      invoice?.customer?.displayName ||
      invoice?.customer?.companyName ||
      invoice?.customer?.name ||
      (typeof invoice?.customer === "string" ? invoice.customer : "") ||
      ""
  )
    .trim()
    .toLowerCase();

const isRetainerInvoice = (invoice: any): boolean =>
  String(invoice?.invoiceNumber || "")
    .toUpperCase()
    .startsWith("RET-");

const isLikelyCustomerId = (value: string): boolean =>
  /^(cus|cust)[-_]/i.test(value) || /^[a-f0-9]{24}$/i.test(value);

const doesInvoiceBelongToCustomer = (invoice: any, customerId: string, customerName: string): boolean => {
  const rowCustomerId = getInvoiceCustomerId(invoice);
  const rowCustomerName = getInvoiceCustomerName(invoice);
  if (customerId && rowCustomerId && isLikelyCustomerId(customerId) && isLikelyCustomerId(rowCustomerId)) {
    return rowCustomerId === customerId;
  }
  if (customerName && rowCustomerName) return rowCustomerName === customerName;
  if (customerId && rowCustomerName && !isLikelyCustomerId(customerId)) return rowCustomerName === customerId.toLowerCase();
  return false;
};

const isInvoiceEligible = (invoice: any): boolean => {
  const status = getNormalizedInvoiceStatus(invoice);
  return !["draft", "paid", "void", "closed", "cancelled"].includes(status);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const ApplyRetainersToInvoiceModal: React.FC<ApplyRetainersToInvoiceModalProps> = ({
  isOpen,
  onClose,
  retainerInvoice,
  payment,
  onSave,
}) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [appliedAmounts, setAppliedAmounts] = useState<Record<string, number>>({});
  const [isDateToggleEnabled, setIsDateToggleEnabled] = useState(true);
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const customerId = String(
    retainerInvoice?.customerId ||
      retainerInvoice?.customer?._id ||
      retainerInvoice?.customer?.id ||
      retainerInvoice?.customer ||
      ""
  );
  const customerName = String(
    retainerInvoice?.customerName ||
      retainerInvoice?.customer?.displayName ||
      retainerInvoice?.customer?.companyName ||
      retainerInvoice?.customer?.name ||
      (typeof retainerInvoice?.customer === "string" ? retainerInvoice.customer : "") ||
      ""
  )
    .trim()
    .toLowerCase();
  const currentRetainerInvoiceId = getInvoiceId(retainerInvoice);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const response = await invoicesAPI.getAll({
          limit: 10000,
        });
        const rows = Array.isArray((response as any)?.data) ? (response as any).data : [];
        const filtered = rows.filter((inv: any) => {
          const invoiceId = getInvoiceId(inv);
          if (!invoiceId || invoiceId === currentRetainerInvoiceId) return false;
          if (isRetainerInvoice(inv)) return false;
          if (!doesInvoiceBelongToCustomer(inv, customerId, customerName)) return false;
          return isInvoiceEligible(inv);
        });
        setInvoices(filtered);
        setAppliedAmounts({});
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [isOpen, customerId, customerName, currentRetainerInvoiceId]);

  const retainerAvailable = useMemo(() => {
    const explicit =
      retainerInvoice?.retainerAvailableAmount ??
      retainerInvoice?.availableAmount ??
      retainerInvoice?.unusedAmount ??
      retainerInvoice?.unusedBalance;
    const fallback = Math.max(
      0,
      Number(retainerInvoice?.balance ?? retainerInvoice?.balanceDue ?? retainerInvoice?.total ?? retainerInvoice?.amount ?? 0)
    );
    const numeric = Number(explicit ?? fallback);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  }, [retainerInvoice]);

  const totalApplied = Object.values(appliedAmounts).reduce((sum, val) => sum + val, 0);
  const remainingRetainer = retainerAvailable - totalApplied;

  const handleAmountChange = (invoiceId: string, value: string, maxBalance: number) => {
    let numValue = parseFloat(value) || 0;
    if (numValue < 0) numValue = 0;

    const currentAmount = appliedAmounts[invoiceId] || 0;
    const otherApplied = totalApplied - currentAmount;
    const availableForThis = Math.max(0, retainerAvailable - otherApplied);
    const maxAllowed = Math.max(0, Math.min(maxBalance, availableForThis));

    if (numValue > maxAllowed) numValue = maxAllowed;

    setAppliedAmounts((prev) => ({
      ...prev,
      [invoiceId]: numValue,
    }));
  };

  const handlePayInFull = (invoiceId: string, balance: number) => {
    const otherApplied = totalApplied - (appliedAmounts[invoiceId] || 0);
    const availableForThis = Math.max(0, retainerAvailable - otherApplied);
    const amountToApply = Math.min(balance, availableForThis);
    setAppliedAmounts((prev) => ({
      ...prev,
      [invoiceId]: amountToApply,
    }));
  };

  const handleClearApplied = () => setAppliedAmounts({});

  const handleSave = async () => {
    if (totalApplied > retainerAvailable) {
      toast("Amount applied exceeds available retainer.");
      return;
    }
    setSaving(true);
    try {
      const allocations = Object.entries(appliedAmounts)
        .filter(([, amount]) => amount > 0)
        .map(([invoiceId, amount]) => ({
          invoiceId,
          amount,
          date: appliedDate,
        }));
      await onSave(allocations);
      onClose();
    } catch (error) {
      console.error("Error applying retainer:", error);
      toast("Failed to apply retainer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-4 pt-8 pb-6 text-center sm:px-6 lg:px-8">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl rounded-lg bg-white text-left overflow-hidden shadow-xl transform transition-all">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-[17px] leading-6 font-medium text-gray-900">Apply Retainers to Invoices</h3>
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
            <div className="flex items-center space-x-8 mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-500 font-medium uppercase">Retainer Invoice#</span>
                  <span className="text-[14px] font-bold text-gray-900 leading-tight">
                    {retainerInvoice?.invoiceNumber || retainerInvoice?.retainerNumber || "-"}
                  </span>
                  <span className="text-[11px] text-gray-500">Payment# {payment?.paymentNumber || "-"}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-[#156372]/10 flex items-center justify-center text-[#156372]">
                  <CheckCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-500 font-medium">Available Credits</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[14px] font-bold text-gray-900 leading-tight">
                      {formatCurrency(retainerAvailable, retainerInvoice?.currency || "USD")}
                    </span>
                    <span className="text-[11px] text-blue-500 font-medium cursor-pointer">Apply Credits to Invoices</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mb-4">
              <h4 className="text-[13px] font-semibold text-gray-800">Customer Invoices</h4>
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-gray-500">Set Applied on Date</span>
                  <Info size={14} className="text-gray-400" />
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isDateToggleEnabled ? "bg-blue-600" : "bg-gray-200"}`}
                    onClick={() => setIsDateToggleEnabled(!isDateToggleEnabled)}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200 ${isDateToggleEnabled ? "translate-x-5" : "translate-x-0"}`}></span>
                  </button>
                </div>
                {isDateToggleEnabled && (
                  <div className="text-[11px] text-gray-500 flex items-center space-x-1">
                    <span>As on</span>
                    <strong className="text-gray-900">{formatDate(appliedDate)}</strong>
                    <span>1 {retainerInvoice?.currency || "USD"} = 1 {retainerInvoice?.currency || "USD"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <button onClick={handleClearApplied} className="text-[11px] text-blue-500 hover:text-blue-700 font-medium">
                Clear Applied Amount
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[14%] px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                    <th className="w-[12%] px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="w-[14%] px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                    <th className="w-[16%] px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="w-[12%] px-4 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Invoice Amount</th>
                    <th className="w-[12%] px-4 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Invoice Balance</th>
                    <th className="w-[12%] px-4 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Credits Applied On</th>
                    <th className="w-[18%] px-4 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Credits to Apply</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 text-[12px]">Loading invoices...</td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500 text-[12px]">No customer invoices found.</td>
                    </tr>
                  ) : (
                    invoices.map((invoice, index) => {
                      const balance = getInvoiceOutstandingBalance(invoice);
                      const amount = appliedAmounts[String(invoice.id || invoice._id || "")] || 0;
                      const status = getNormalizedInvoiceStatus(invoice) || "-";
                      return (
                        <tr key={String(invoice.id || invoice._id || index)} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-700 font-medium">
                            {invoice.invoiceNumber || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-500 capitalize">
                            {status}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-500">
                            {formatDate(invoice.date || invoice.invoiceDate || "")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-500">
                            {String(invoice.location || invoice.locationName || "Head Office")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-700 text-right">
                            {formatCurrency(Number(invoice.total || 0), retainerInvoice?.currency || "USD")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-700 text-right font-medium">
                            {formatCurrency(balance, retainerInvoice?.currency || "USD")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-[12px] text-gray-500 text-right">
                            {formatDate(appliedDate)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end space-y-1">
                              <input
                                type="number"
                                value={amount === 0 ? "" : amount}
                                onChange={(e) => handleAmountChange(String(invoice.id || invoice._id || ""), e.target.value, balance)}
                                disabled={balance <= 0}
                                className={`w-24 px-2 py-1.5 text-right border ${balance <= 0 ? "bg-gray-100 cursor-not-allowed border-gray-200" : "border-blue-300 focus:ring-blue-500"} rounded-md text-[12px] focus:outline-none focus:ring-1 transition-shadow`}
                                placeholder="0.00"
                              />
                              {balance > 0 ? (
                                <button
                                  onClick={() => handlePayInFull(String(invoice.id || invoice._id || ""), balance)}
                                  className="text-[11px] text-blue-500 hover:text-blue-700 font-medium hover:underline"
                                >
                                  Pay in Full
                                </button>
                              ) : (
                                <span className="text-[11px] text-gray-400">No balance available</span>
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

            <div className="mt-6 flex justify-end">
              <div className="w-80 bg-gray-50 rounded-lg p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] text-gray-600">Amount:</span>
                  <span className="text-[12px] font-medium text-gray-900">{formatCurrency(totalApplied, retainerInvoice?.currency || "USD")}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className={`text-gray-600 ${remainingRetainer < 0 ? "text-red-500" : ""}`}>Retainer Amount Available:</span>
                  <span className={`font-bold ${remainingRetainer < 0 ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(Math.max(0, remainingRetainer), retainerInvoice?.currency || "USD")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto ${saving || totalApplied === 0 || remainingRetainer < 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleSave}
              disabled={saving || totalApplied === 0 || remainingRetainer < 0}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto"
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

export default ApplyRetainersToInvoiceModal;
