import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { TRANSACTION_SECTION_OPTIONS } from "./customerDetailConstants";
import CustomerDetailTransactionsFooterSections from "./CustomerDetailTransactionsFooterSections";

export default function CustomerDetailTransactionsTab(args: any) {
  const {
    goToTransactionsDropdownRef,
    isGoToTransactionsDropdownOpen,
    setIsGoToTransactionsDropdownOpen,
    expandedTransactions,
    openTransactionSection,
    toggleTransactionSection,
    navigate,
    customer,
    statusDropdownRef,
    isStatusDropdownOpen,
    setIsStatusDropdownOpen,
    invoiceStatusFilter,
    invoiceStatusOptions,
    setInvoiceStatusFilter,
    setInvoiceCurrentPage,
    formatStatusLabel,
    filteredInvoices,
    startIndex,
    endIndex,
    paginatedInvoices,
    normalizeInvoiceStatus,
    formatCurrency,
    invoiceCurrentPage,
    totalPages,
    payments,
    quoteStatusDropdownRef,
    isQuoteStatusDropdownOpen,
    setIsQuoteStatusDropdownOpen,
    quoteStatusFilter,
    setQuoteStatusFilter,
    getFilteredQuotes,
    recurringInvoiceStatusDropdownRef,
    isRecurringInvoiceStatusDropdownOpen,
    setIsRecurringInvoiceStatusDropdownOpen,
    recurringInvoiceStatusFilter,
    setRecurringInvoiceStatusFilter,
    getFilteredRecurringInvoices,
    expenseStatusDropdownRef,
    isExpenseStatusDropdownOpen,
    setIsExpenseStatusDropdownOpen,
    expenseStatusFilter,
    setExpenseStatusFilter,
    getFilteredExpenses,
    recurringExpenseStatusDropdownRef,
    isRecurringExpenseStatusDropdownOpen,
    setIsRecurringExpenseStatusDropdownOpen,
    recurringExpenseStatusFilter,
    setRecurringExpenseStatusFilter,
    getFilteredRecurringExpenses,
    projectStatusDropdownRef,
    isProjectStatusDropdownOpen,
    setIsProjectStatusDropdownOpen,
    projectStatusFilter,
    setProjectStatusFilter,
    getFilteredProjects,
    creditNoteStatusDropdownRef,
    isCreditNoteStatusDropdownOpen,
    setIsCreditNoteStatusDropdownOpen,
    creditNoteStatusFilter,
    setCreditNoteStatusFilter,
    getFilteredCreditNotes,
    salesReceiptStatusDropdownRef,
    isSalesReceiptStatusDropdownOpen,
    setIsSalesReceiptStatusDropdownOpen,
    salesReceiptStatusFilter,
    setSalesReceiptStatusFilter,
    getFilteredSalesReceipts,
  } = args;

  const customerId = String(customer?.id || customer?._id || "").trim();
  const customerName = String(customer?.name || customer?.displayName || customer?.companyName || "").trim();

  return (
                        <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
                            <div className="relative inline-block mb-4" ref={goToTransactionsDropdownRef}>
                                <button
                                    className="flex items-center gap-1 text-sm text-[#0f5ca8] cursor-pointer hover:underline"
                                    onClick={() => setIsGoToTransactionsDropdownOpen((prev) => !prev)}
                                >
                                    Go to transactions
                                    <ChevronDown size={14} />
                                </button>
                                {isGoToTransactionsDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-[210px] max-h-[430px] overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                                        {TRANSACTION_SECTION_OPTIONS.map((option) => {
                                            const isActive = Boolean(expandedTransactions[option.key]);
                                            return (
                                                <button
                                                    key={option.key}
                                                    className={`w-full text-left px-3 py-2 text-[14px] cursor-pointer ${isActive ? "bg-blue-500 text-white rounded-md mx-1 w-[calc(100%-8px)]" : "text-gray-800 hover:bg-gray-50"}`}
                                                    onClick={() => openTransactionSection(option.key)}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Transaction Categories List */}
                            <div className="space-y-0">
                                {/* Subscriptions */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.subscriptions ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("subscriptions")}
                                    >
                                        {expandedTransactions.subscriptions ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Subscriptions</span>
                                    </div>
                                </div>
                                {expandedTransactions.subscriptions && (
                                    <div className="bg-white border-b border-gray-200">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">CREATION DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">LOCATION</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">SUBSCRIPTION NUMBER</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">PLAN</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">NEXT BILLING DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td colSpan={8} className="py-8 px-4 text-center text-sm text-gray-500">
                                                            No subscriptions have been created for this customer yet.
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Invoices */}
                                <>
                                    <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.invoices ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                        <div
                                            className="flex items-center gap-3 flex-1 cursor-pointer"
                                            onClick={() => toggleTransactionSection("invoices")}
                                        >
                                            {expandedTransactions.invoices ? (
                                                <ChevronDown size={16} className="text-gray-400" />
                                            ) : (
                                                <ChevronRight size={16} className="text-gray-400" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900">Invoices</span>
                                        </div>
                                        <button
                                            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                e.stopPropagation();
                                            navigate("/sales/invoices/new", { state: { customerId, customerName } });
                                            }}
                                        >
                                            <Plus size={14} />
                                            New
                                        </button>
                                    </div>
                                    {expandedTransactions.invoices && (
                                        <div className="pt-1 pb-0 bg-white border-b border-gray-200">
                                            <div className="flex items-center justify-end px-4 py-1 mb-0">
                                                <div className="relative" ref={statusDropdownRef}>
                                                    <button
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                    >
                                                        <Filter size={14} className="text-blue-600" />
                                                        Status: {invoiceStatusFilter === "all" ? "All" : formatStatusLabel(invoiceStatusFilter)}
                                                        <ChevronDown size={14} />
                                                    </button>
                                                    {isStatusDropdownOpen && (
                                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                                                            {invoiceStatusOptions.map(status => (
                                                                <div
                                                                    key={status}
                                                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${invoiceStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                    onClick={() => {
                                                                        setInvoiceStatusFilter(status);
                                                                        setIsStatusDropdownOpen(false);
                                                                        setInvoiceCurrentPage(1);
                                                                    }}
                                                                >
                                                                    {status === "all" ? "All" : formatStatusLabel(status)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                <table className="w-full border-collapse text-[13px]">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LOCATION</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">INVOICE NUMBER</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">ORDER NUMBER</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE DUE</th>
                                                            <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedInvoices.length > 0 ? (
                                                            paginatedInvoices.map((invoice) => (
                                                                <tr
                                                                    key={invoice.id}
                                                                    onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                                                                    className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                                >
                                                                    <td className="py-3 px-4 text-gray-900">
                                                                        {new Date(String(invoice.invoiceDate || invoice.date || invoice.createdAt || 0)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-900">
                                                                        {(invoice as any).location || (customer as any)?.location || "Head Office"}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-900">
                                                                        <span
                                                                            className="text-blue-600 no-underline font-medium hover:underline cursor-pointer"
                                                                            onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/sales/invoices/${invoice.id}`);
                                                                            }}
                                                                        >
                                                                            {invoice.invoiceNumber || invoice.id}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-900">{invoice.orderNumber || "-"}</td>
                                                                    <td className="py-3 px-4 text-gray-900">{formatCurrency(invoice.total || invoice.amount || 0, invoice.currency || customer?.currency || "AMD")}</td>
                                                                    <td className="py-3 px-4 text-gray-900">{formatCurrency(invoice.balance || invoice.total || invoice.amount || 0, invoice.currency || customer?.currency || "AMD")}</td>
                                                                    <td className="py-3 px-4 text-gray-900">
                                                                        <span
                                                                            className="text-xs font-medium"
                                                                            style={{
                                                                                color:
                                                                                    normalizeInvoiceStatus(invoice) === "paid" ? "#10b981" :
                                                                                        normalizeInvoiceStatus(invoice) === "overdue" ? "#ef4444" :
                                                                                            normalizeInvoiceStatus(invoice) === "client viewed" ? "#2563eb" :
                                                                                                normalizeInvoiceStatus(invoice) === "unpaid" ? "#f59e0b" :
                                                                                                    "#9ca3af"
                                                                            }}
                                                                        >
                                                                            {formatStatusLabel(normalizeInvoiceStatus(invoice))}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                    There are no invoices.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                {filteredInvoices.length > 0 && (
                                                    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                                                        <div className="text-sm text-gray-700">
                                                            Total Count: <span className="text-blue-600 cursor-pointer hover:underline">View</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={() => setInvoiceCurrentPage(prev => Math.max(1, prev - 1))}
                                                                disabled={invoiceCurrentPage === 1}
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <span className="text-sm text-gray-700 px-2">
                                                                {startIndex + 1} - {Math.min(endIndex, filteredInvoices.length)}
                                                            </span>
                                                            <button
                                                                className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={() => setInvoiceCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                                disabled={invoiceCurrentPage === totalPages}
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>


                                {/* Customer Payments */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.customerPayments ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("customerPayments")}
                                    >
                                        {expandedTransactions.customerPayments ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Customer Payments</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/payments/payments-received/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.customerPayments && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAYMENT#</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">INVOICE#</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">MODE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.length > 0 ? (
                                                        payments.map((payment) => (
                                                            <tr
                                                                key={payment.id}
                                                                onClick={() => navigate(`/sales/payments-received/${payment.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900">
                                                                    {new Date(String(payment.paymentDate || payment.date || payment.createdAt || 0)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="py-3 px-4 text-gray-900">
                                                                    <span className="text-blue-600 no-underline font-medium hover:underline cursor-pointer">
                                                                        {payment.paymentNumber || payment.id}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-gray-900">{payment.referenceNumber || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{payment.invoiceNumber || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{payment.paymentMode || payment.mode || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(payment.amountReceived || payment.amount || 0, payment.currency || customer?.currency || "AMD")}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no payments.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Links */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.paymentLinks ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("paymentLinks")}
                                    >
                                        {expandedTransactions.paymentLinks ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Payment Links</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/payments/payment-links/new");
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.paymentLinks && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="text-sm text-gray-500">
                                            No payment links found.
                                        </div>
                                    </div>
                                )}

                                {/* Quotes */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.quotes ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("quotes")}
                                    >
                                        {expandedTransactions.quotes ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Quotes</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/sales/quotes/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.quotes && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="flex items-center justify-end gap-2 mb-0">
                                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <Filter size={16} />
                                            </button>
                                            <div className="relative" ref={quoteStatusDropdownRef}>
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setIsQuoteStatusDropdownOpen(!isQuoteStatusDropdownOpen)}
                                                >
                                                    Status: {quoteStatusFilter === "all" ? "All" : quoteStatusFilter.charAt(0).toUpperCase() + quoteStatusFilter.slice(1)}
                                                    <ChevronDown size={14} />
                                                </button>
                                                {isQuoteStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                                                        {["all", "draft", "sent", "accepted", "declined", "expired", "invoiced"].map(status => (
                                                            <div
                                                                key={status}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${quoteStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                onClick={() => {
                                                                    setQuoteStatusFilter(status);
                                                                    setIsQuoteStatusDropdownOpen(false);
                                                                }}
                                                            >
                                                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">QUOTE#</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredQuotes().length > 0 ? (
                                                        getFilteredQuotes().map((quote) => (
                                                            <tr
                                                                key={quote.id}
                                                                onClick={() => navigate(`/sales/quotes/${quote.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900">
                                                                    {new Date(String(quote.date || quote.quoteDate || quote.createdAt || 0)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="py-3 px-4 text-gray-900 px-4">
                                                                    <span className="text-blue-600 no-underline font-medium hover:underline cursor-pointer">
                                                                        {quote.quoteNumber || quote.id}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-gray-900">{quote.referenceNumber || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(quote.total || 0, quote.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(quote.status || "draft").toLowerCase() === "accepted" ? "bg-green-100 text-green-700" :
                                                                        (quote.status || "draft").toLowerCase() === "sent" ? "bg-blue-100 text-blue-700" :
                                                                            (quote.status || "draft").toLowerCase() === "declined" ? "bg-red-100 text-red-700" :
                                                                                (quote.status || "draft").toLowerCase() === "expired" ? "bg-gray-100 text-gray-700" :
                                                                                    (quote.status || "draft").toLowerCase() === "invoiced" ? "bg-purple-100 text-purple-700" :
                                                                                        "bg-gray-100 text-gray-700"
                                                                        }`}>
                                                                        {quote.status || "Draft"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={5} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no quotes.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Retainer Invoices */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.recurringInvoices ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("recurringInvoices")}
                                    >
                                        {expandedTransactions.recurringInvoices ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Retainer Invoices</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/sales/retainer-invoices/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.recurringInvoices && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="flex items-center justify-end gap-2 mb-0">
                                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <Filter size={16} />
                                            </button>
                                            <div className="relative" ref={recurringInvoiceStatusDropdownRef}>
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setIsRecurringInvoiceStatusDropdownOpen(!isRecurringInvoiceStatusDropdownOpen)}
                                                >
                                                    Status: {recurringInvoiceStatusFilter === "all" ? "All" : recurringInvoiceStatusFilter.charAt(0).toUpperCase() + recurringInvoiceStatusFilter.slice(1)}
                                                    <ChevronDown size={14} />
                                                </button>
                                                {isRecurringInvoiceStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                                                        {["all", "active", "stopped", "completed", "expired"].map(status => (
                                                            <div
                                                                key={status}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${recurringInvoiceStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                onClick={() => {
                                                                    setRecurringInvoiceStatusFilter(status);
                                                                    setIsRecurringInvoiceStatusDropdownOpen(false);
                                                                }}
                                                            >
                                                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROFILE NAME</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">FREQUENCY</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LAST INVOICE DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NEXT INVOICE DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredRecurringInvoices().length > 0 ? (
                                                        getFilteredRecurringInvoices().map((ri) => (
                                                            <tr
                                                                key={ri.id}
                                                                onClick={() => navigate(`/sales/retainer-invoices/${ri.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900 font-medium">{ri.profileName || ri.id}</td>
                                                                <td className="py-3 px-4 text-gray-900">{ri.repeatEvery} {ri.repeatUnit}</td>
                                                                <td className="py-3 px-4 text-gray-900">{ri.lastInvoiceDate ? new Date(ri.lastInvoiceDate).toLocaleDateString() : "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{ri.nextInvoiceDate ? new Date(ri.nextInvoiceDate).toLocaleDateString() : "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(ri.total || 0, ri.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(ri.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-700" :
                                                                        (ri.status || "").toLowerCase() === "stopped" ? "bg-red-100 text-red-700" :
                                                                            "bg-gray-100 text-gray-700"
                                                                        }`}>
                                                                        {ri.status || "Active"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no retainer invoices.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Expenses */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.expenses ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("expenses")}
                                    >
                                        {expandedTransactions.expenses ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Expenses</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/purchases/expenses/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.expenses && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="flex items-center justify-end gap-2 mb-0">
                                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <Filter size={16} />
                                            </button>
                                            <div className="relative" ref={expenseStatusDropdownRef}>
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setIsExpenseStatusDropdownOpen(!isExpenseStatusDropdownOpen)}
                                                >
                                                    Status: {expenseStatusFilter === "all" ? "All" : expenseStatusFilter.charAt(0).toUpperCase() + expenseStatusFilter.slice(1)}
                                                    <ChevronDown size={14} />
                                                </button>
                                                {isExpenseStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                                                        {["all", "unbilled", "invoiced", "reimbursable", "non-reimbursable"].map(status => (
                                                            <div
                                                                key={status}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${expenseStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                onClick={() => {
                                                                    setExpenseStatusFilter(status);
                                                                    setIsExpenseStatusDropdownOpen(false);
                                                                }}
                                                            >
                                                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">EXPENSE ACCOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">VENDOR NAME</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAID THROUGH</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredExpenses().length > 0 ? (
                                                        getFilteredExpenses().map((expense) => (
                                                            <tr
                                                                key={expense.id}
                                                                onClick={() => navigate(`/purchases/expenses/${expense.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900">
                                                                    {new Date(String(expense.date || expense.createdAt || 0)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="py-3 px-4 text-gray-900">{expense.expenseAccount || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{expense.referenceNumber || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{expense.vendorName || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{expense.paidThrough || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900 font-medium">{formatCurrency(expense.amount || 0, expense.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(expense.status || "").toLowerCase() === "invoiced" ? "bg-green-100 text-green-700" :
                                                                        "bg-gray-100 text-gray-700"
                                                                        }`}>
                                                                        {expense.status || "Unbilled"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no expenses.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Recurring Expenses */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.recurringExpenses ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("recurringExpenses")}
                                    >
                                        {expandedTransactions.recurringExpenses ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Recurring Expenses</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/purchases/expenses/recurring/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.recurringExpenses && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="flex items-center justify-end gap-2 mb-0">
                                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <Filter size={16} />
                                            </button>
                                            <div className="relative" ref={recurringExpenseStatusDropdownRef}>
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setIsRecurringExpenseStatusDropdownOpen(!isRecurringExpenseStatusDropdownOpen)}
                                                >
                                                    Status: {recurringExpenseStatusFilter === "all" ? "All" : recurringExpenseStatusFilter.charAt(0).toUpperCase() + recurringExpenseStatusFilter.slice(1)}
                                                    <ChevronDown size={14} />
                                                </button>
                                                {isRecurringExpenseStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                                                        {["all", "active", "stopped", "expired"].map(status => (
                                                            <div
                                                                key={status}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${recurringExpenseStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                onClick={() => {
                                                                    setRecurringExpenseStatusFilter(status);
                                                                    setIsRecurringExpenseStatusDropdownOpen(false);
                                                                }}
                                                            >
                                                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROFILE NAME</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">FREQUENCY</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LAST EXPENSE DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NEXT EXPENSE DATE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredRecurringExpenses().length > 0 ? (
                                                        getFilteredRecurringExpenses().map((re) => (
                                                            <tr
                                                                key={re.id}
                                                                onClick={() => navigate(`/purchases/expenses/recurring/${re.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900 font-medium">{re.profileName || re.id}</td>
                                                                <td className="py-3 px-4 text-gray-900">{re.repeatEvery} {re.repeatUnit}</td>
                                                                <td className="py-3 px-4 text-gray-900">{re.lastExpenseDate ? new Date(re.lastExpenseDate).toLocaleDateString() : "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{re.nextExpenseDate ? new Date(re.nextExpenseDate).toLocaleDateString() : "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(re.amount || 0, re.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(re.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-700" :
                                                                        (re.status || "").toLowerCase() === "stopped" ? "bg-red-100 text-red-700" :
                                                                            "bg-gray-100 text-gray-700"
                                                                        }`}>
                                                                        {re.status || "Active"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no recurring expenses.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Projects */}
                                <div className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${expandedTransactions.projects ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleTransactionSection("projects")}
                                    >
                                        {expandedTransactions.projects ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">Projects</span>
                                    </div>
                                    <button
                                        className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            navigate("/time-tracking/projects/new", { state: { customerId, customerName } });
                                        }}
                                    >
                                        <Plus size={14} />
                                        New
                                    </button>
                                </div>
                                {expandedTransactions.projects && (
                                    <div className="p-4 bg-white border-b border-gray-200">
                                        <div className="flex items-center justify-end gap-2 mb-0">
                                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                                                <Filter size={16} />
                                            </button>
                                            <div className="relative" ref={projectStatusDropdownRef}>
                                                <button
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setIsProjectStatusDropdownOpen(!isProjectStatusDropdownOpen)}
                                                >
                                                    Status: {projectStatusFilter === "all" ? "All" : projectStatusFilter.charAt(0).toUpperCase() + projectStatusFilter.slice(1)}
                                                    <ChevronDown size={14} />
                                                </button>
                                                {isProjectStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                                                        {["all", "active", "on hold", "finished", "cancelled"].map(status => (
                                                            <div
                                                                key={status}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${projectStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                                                onClick={() => {
                                                                    setProjectStatusFilter(status);
                                                                    setIsProjectStatusDropdownOpen(false);
                                                                }}
                                                            >
                                                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full border-collapse text-[13px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROJECT NAME</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROJECT CODE</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BILLING METHOD</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">TOTAL HOURS</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BILLED AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">UN-BILLED AMOUNT</th>
                                                        <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getFilteredProjects().length > 0 ? (
                                                        getFilteredProjects().map((project) => (
                                                            <tr
                                                                key={project.id}
                                                                onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                                                                className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <td className="py-3 px-4 text-gray-900 font-medium">{project.projectName || project.name}</td>
                                                                <td className="py-3 px-4 text-gray-900">{project.projectCode || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{project.billingMethod || "-"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{project.totalHours || "0:00"}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(project.billedAmount || 0, project.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4 text-gray-900">{formatCurrency(project.unbilledAmount || 0, project.currency || customer?.currency || "AMD")}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(project.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-700" :
                                                                        (project.status || "").toLowerCase() === "finished" ? "bg-blue-100 text-blue-700" :
                                                                            "bg-gray-100 text-gray-700"
                                                                        }`}>
                                                                        {project.status || "Active"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">
                                                                There are no projects.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Journals and Bills removed from customer Transactions tab */}
                            </div>

                            <CustomerDetailTransactionsFooterSections
                                expandedTransactions={expandedTransactions}
                                toggleTransactionSection={toggleTransactionSection}
                                navigate={navigate}
                                customer={customer}
                                creditNoteStatusDropdownRef={creditNoteStatusDropdownRef}
                                isCreditNoteStatusDropdownOpen={isCreditNoteStatusDropdownOpen}
                                setIsCreditNoteStatusDropdownOpen={setIsCreditNoteStatusDropdownOpen}
                                creditNoteStatusFilter={creditNoteStatusFilter}
                                setCreditNoteStatusFilter={setCreditNoteStatusFilter}
                                getFilteredCreditNotes={getFilteredCreditNotes}
                                formatCurrency={formatCurrency}
                                salesReceiptStatusDropdownRef={salesReceiptStatusDropdownRef}
                                isSalesReceiptStatusDropdownOpen={isSalesReceiptStatusDropdownOpen}
                                setIsSalesReceiptStatusDropdownOpen={setIsSalesReceiptStatusDropdownOpen}
                                salesReceiptStatusFilter={salesReceiptStatusFilter}
                                setSalesReceiptStatusFilter={setSalesReceiptStatusFilter}
                                getFilteredSalesReceipts={getFilteredSalesReceipts}
                            />
                        </div>
  );
}
