import React from "react";
import { formatCurrency, formatDate, getInvoiceBalanceDueValue, getInvoiceDateValue, getInvoiceDueDateValue, getInvoiceStatusMeta, toNumber } from "./QuoteDetail.utils";

type Props = {
  quote?: any;
  linkedInvoices?: any[];
  linkedInvoicesLoading?: boolean;
  compact?: boolean;
  onConvertToInvoice?: () => void;
  onNavigateToInvoice?: (invoiceId: string) => void;
};

const QuoteDetailLinkedInvoicesTable = ({
  quote,
  linkedInvoices = [],
  linkedInvoicesLoading = false,
  compact = false,
  onConvertToInvoice,
  onNavigateToInvoice,
}: Props) => {
  const visibleLinkedInvoices = linkedInvoices.filter((invoice: any) => {
    const status = String(invoice?.status || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
    return status === "paid" || status === "partially_paid";
  });

  if (linkedInvoicesLoading || visibleLinkedInvoices.length === 0) return null;

  return (
    <div id="quote-linked-invoices" className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
            {visibleLinkedInvoices.length}
          </span>
        </div>
        {!compact && onConvertToInvoice && (
          <button
            type="button"
            className="text-sm font-medium text-[#2F80FF] hover:underline"
            onClick={onConvertToInvoice}
          >
            Convert to Invoice
          </button>
        )}
      </div>

      {visibleLinkedInvoices.length === 0 ? (
        <div className="px-5 py-6 text-sm text-gray-600">No linked invoices found for this quote.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#f8fafc]">
              <tr className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="text-left py-2.5 px-4 min-w-[130px]">Date</th>
                <th className="text-left py-2.5 px-4 min-w-[150px]">Invoice#</th>
                <th className="text-left py-2.5 px-4 min-w-[130px]">Status</th>
                <th className="text-left py-2.5 px-4 min-w-[130px]">Due Date</th>
                <th className="text-right py-2.5 px-4 min-w-[130px]">Amount</th>
                <th className="text-right py-2.5 px-4 min-w-[140px]">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleLinkedInvoices.map((invoice: any) => {
                const statusMeta = getInvoiceStatusMeta(invoice);
                const invoiceId = String(invoice?.id || invoice?._id || "").trim();
                const invoiceNumber = String(invoice?.invoiceNumber || invoice?.number || invoiceId || "-").trim();
                const invoiceDate = formatDate(getInvoiceDateValue(invoice));
                const dueDate = formatDate(getInvoiceDueDateValue(invoice));
                const amount = toNumber(invoice?.total ?? invoice?.amount ?? 0);
                const balanceDue = getInvoiceBalanceDueValue(invoice);
                return (
                  <tr key={invoiceId || invoiceNumber} className="text-sm">
                    <td className="py-3 px-4 text-gray-800">{invoiceDate}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        className="text-[#2F80FF] hover:underline font-medium"
                        onClick={() => invoiceId && onNavigateToInvoice?.(invoiceId)}
                      >
                        {invoiceNumber}
                      </button>
                    </td>
                    <td className={`py-3 px-4 font-semibold ${statusMeta.className}`}>{statusMeta.label}</td>
                    <td className="py-3 px-4 text-gray-800">{dueDate}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(amount, quote?.currency)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(balanceDue, quote?.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuoteDetailLinkedInvoicesTable;

