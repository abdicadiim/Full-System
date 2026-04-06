import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Filter, Plus } from "lucide-react";
import { formatCurrency } from "../CustomerDetail/CustomerDetail.shared";

function Section({
  expanded,
  title,
  onToggle,
  action,
  children,
}: {
  expanded: boolean;
  title: string;
  onToggle: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          expanded ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={onToggle}>
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        {action}
      </div>
      {expanded && children}
    </div>
  );
}

function EmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 px-4 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

function toArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatDate(value: any) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CustomerDetailTransactionsSales({ detail }: { detail: any }) {
  const { id: routeCustomerId } = useParams();
  const navigate = useNavigate();

  const {
    activeTab,
    customer,
    expandedTransactions = {},
    invoices,
    payments,
    quotes,
    recurringInvoices,
    expenses,
    creditNotes,
    salesReceipts,
    toggleTransactionSection,
  } = detail as any;

  const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
  const customerCurrency = String(customer?.currency || "USD").trim() || "USD";

  const invoiceRows = useMemo(() => toArray(invoices), [invoices]);
  const paymentRows = useMemo(() => toArray(payments), [payments]);
  const quoteRows = useMemo(() => toArray(quotes), [quotes]);
  const recurringInvoiceRows = useMemo(() => toArray(recurringInvoices), [recurringInvoices]);
  const expenseRows = useMemo(() => toArray(expenses), [expenses]);
  const creditNoteRows = useMemo(() => toArray(creditNotes), [creditNotes]);
  const salesReceiptRows = useMemo(() => toArray(salesReceipts), [salesReceipts]);

  if (activeTab !== "transactions") return null;

  const toggle = typeof toggleTransactionSection === "function" ? toggleTransactionSection : () => {};

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white px-6 py-4" style={{ paddingRight: 0 }}>
      <button className="flex items-center gap-2 px-4 py-2 mb-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
        Go to transactions
        <ChevronDown size={16} />
      </button>

      <div className="space-y-4">
        <Section
          expanded={Boolean(expandedTransactions.invoices)}
          title="Invoices"
          onToggle={() => toggle("invoices")}
          action={
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                navigate("/sales/invoices/new", { state: { customerId, customerName: customer?.name } });
              }}
            >
              <Plus size={14} />
              New
            </button>
          }
        >
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-end gap-2 mb-3">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer" type="button">
                <Filter size={16} />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50" type="button">
                Status: All
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LOCATION</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">INVOICE NUMBER</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">ORDER NUMBER</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE DUE</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.length > 0 ? (
                    invoiceRows.map((invoice: any, index: number) => {
                      const rowId = String(invoice.id || invoice._id || `${index}`);
                      const invoiceNumber = String(invoice.invoiceNumber || invoice.invoiceNo || invoice.number || invoiceIdOrFallback(invoice, rowId));
                      return (
                        <tr
                          key={rowId}
                          onClick={() => rowId && navigate(`/sales/invoices/${rowId}`)}
                          className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900">{formatDate(invoice.date || invoice.invoiceDate || invoice.createdAt)}</td>
                          <td className="py-3 px-4 text-gray-900">{invoice.locationName || invoice.location || "-"}</td>
                          <td className="py-3 px-4 text-blue-600 font-medium">{invoiceNumber}</td>
                          <td className="py-3 px-4 text-gray-900">{invoice.orderNumber || invoice.salesOrderNumber || "-"}</td>
                          <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(Number(invoice.total || invoice.amount || 0), invoice.currency || customerCurrency)}</td>
                          <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(Number(invoice.balanceDue || invoice.balance_due || 0), invoice.currency || customerCurrency)}</td>
                          <td className="py-3 px-4 text-gray-600">{String(invoice.status || invoice.invoiceStatus || "Draft")}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <EmptyState colSpan={7} message="No invoices found." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section
          expanded={Boolean(expandedTransactions.customerPayments)}
          title="Customer Payments"
          onToggle={() => toggle("customerPayments")}
          action={
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                navigate("/payments/payments-received/new", { state: { customerId, customerName: customer?.name } });
              }}
            >
              <Plus size={14} />
              New
            </button>
          }
        >
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LOCATION</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAYMENT NUMBER</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAYMENT MODE</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-600 text-xs uppercase tracking-wider">UNUSED AMOUNT</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.length > 0 ? (
                    paymentRows.map((payment: any, index: number) => {
                      const rowId = String(payment.id || payment._id || `${index}`);
                      return (
                        <tr
                          key={rowId}
                          onClick={() => rowId && navigate(`/payments/payments-received/${rowId}`)}
                          className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900">{formatDate(payment.date || payment.paymentDate || payment.createdAt)}</td>
                          <td className="py-3 px-4 text-gray-900">{payment.locationName || payment.location || "-"}</td>
                          <td className="py-3 px-4 text-blue-600 font-medium">{payment.paymentNumber || payment.number || rowId}</td>
                          <td className="py-3 px-4 text-gray-900">{payment.referenceNumber || payment.reference || "-"}</td>
                          <td className="py-3 px-4 text-gray-900">{payment.paymentMode || payment.mode || "-"}</td>
                          <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(Number(payment.amount || payment.amountReceived || 0), payment.currency || customerCurrency)}</td>
                          <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(Number(payment.unusedAmount || 0), payment.currency || customerCurrency)}</td>
                          <td className="py-3 px-4 text-gray-600">{String(payment.status || "Recorded")}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <EmptyState colSpan={8} message="No payments have been received or recorded yet." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section expanded={Boolean(expandedTransactions.paymentLinks)} title="Payment Links" onToggle={() => toggle("paymentLinks")} />

        <Section
          expanded={Boolean(expandedTransactions.quotes)}
          title="Quotes"
          onToggle={() => toggle("quotes")}
          action={
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                navigate("/sales/quotes/new", { state: { customerId, customerName: customer?.name } });
              }}
            >
              <Plus size={14} />
              New
            </button>
          }
        >
          {expandedTransactions.quotes && (
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">QUOTE NUMBER</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                      <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteRows.length > 0 ? (
                      quoteRows.map((quote: any, index: number) => {
                        const rowId = String(quote.id || quote._id || `${index}`);
                        return (
                          <tr key={rowId} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => rowId && navigate(`/sales/quotes/${rowId}`)}>
                            <td className="py-3 px-4 text-gray-900">{formatDate(quote.date || quote.quoteDate || quote.createdAt)}</td>
                            <td className="py-3 px-4 text-blue-600 font-medium">{quote.quoteNumber || quote.quoteNo || rowId}</td>
                            <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(Number(quote.total || quote.amount || 0), quote.currency || customerCurrency)}</td>
                            <td className="py-3 px-4 text-gray-600">{String(quote.status || "Draft")}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <EmptyState colSpan={4} message="No quotes found." />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>

        <Section expanded={Boolean(expandedTransactions.recurringInvoices)} title="Recurring Invoices" onToggle={() => toggle("recurringInvoices")} />
        <Section expanded={Boolean(expandedTransactions.expenses)} title="Expenses" onToggle={() => toggle("expenses")} />
        <Section expanded={Boolean(expandedTransactions.recurringExpenses)} title="Recurring Expenses" onToggle={() => toggle("recurringExpenses")} />
        <Section expanded={Boolean(expandedTransactions.projects)} title="Projects" onToggle={() => toggle("projects")} />
        <Section expanded={Boolean(expandedTransactions.creditNotes)} title="Credit Notes" onToggle={() => toggle("creditNotes")} />
        <Section expanded={Boolean(expandedTransactions.salesReceipts)} title="Sales Receipts" onToggle={() => toggle("salesReceipts")} />
        <Section expanded={Boolean(expandedTransactions.refunds)} title="Refunds" onToggle={() => toggle("refunds")} />
      </div>
    </div>
  );
}

function invoiceIdOrFallback(invoice: any, fallback: string) {
  return String(invoice.invoiceNumber || invoice.invoiceNo || invoice.number || fallback);
}
