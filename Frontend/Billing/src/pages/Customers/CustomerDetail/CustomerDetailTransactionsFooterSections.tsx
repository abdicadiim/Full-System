import React from "react";
import { ChevronDown, ChevronRight, Filter, Plus } from "lucide-react";

export default function CustomerDetailTransactionsFooterSections(args: any) {
  const {
    expandedTransactions,
    toggleTransactionSection,
    navigate,
    customer,
    creditNoteStatusDropdownRef,
    isCreditNoteStatusDropdownOpen,
    setIsCreditNoteStatusDropdownOpen,
    creditNoteStatusFilter,
    setCreditNoteStatusFilter,
    getFilteredCreditNotes,
    formatCurrency,
    salesReceiptStatusDropdownRef,
    isSalesReceiptStatusDropdownOpen,
    setIsSalesReceiptStatusDropdownOpen,
    salesReceiptStatusFilter,
    setSalesReceiptStatusFilter,
    getFilteredSalesReceipts,
  } = args;

  return (
    <>
      <div
        className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          expandedTransactions.creditNotes ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTransactionSection("creditNotes")}>
          {expandedTransactions.creditNotes ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900">Credit Notes</span>
        </div>
        <button
          className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={(event) => {
            event.stopPropagation();
            navigate("/sales/credit-notes/new", { state: { customerId: customer?.id, customerName: customer?.name } });
          }}
        >
          <Plus size={14} />
          New
        </button>
      </div>
      {expandedTransactions.creditNotes && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={creditNoteStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsCreditNoteStatusDropdownOpen(!isCreditNoteStatusDropdownOpen)}
              >
                Status: {creditNoteStatusFilter === "all" ? "All" : creditNoteStatusFilter.charAt(0).toUpperCase() + creditNoteStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isCreditNoteStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "draft", "open", "closed", "void"].map((status) => (
                    <div
                      key={status}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                        creditNoteStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setCreditNoteStatusFilter(status);
                        setIsCreditNoteStatusDropdownOpen(false);
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
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">CREDIT NOTE#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredCreditNotes().length > 0 ? (
                  getFilteredCreditNotes().map((creditNote: any) => (
                    <tr
                      key={creditNote.id}
                      onClick={() => navigate(`/sales/credit-notes/${creditNote.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(String(creditNote.date || creditNote.creditNoteDate || 0)).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{creditNote.creditNoteNumber || creditNote.id}</td>
                      <td className="py-3 px-4 text-gray-900">{creditNote.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {formatCurrency(creditNote.total || 0, creditNote.currency || customer?.currency || "AMD")}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {formatCurrency(creditNote.balance || 0, creditNote.currency || customer?.currency || "AMD")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${
                            (creditNote.status || "").toLowerCase() === "open"
                              ? "bg-blue-100 text-blue-700"
                              : (creditNote.status || "").toLowerCase() === "closed"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {creditNote.status || "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no credit notes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          expandedTransactions.salesReceipts ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTransactionSection("salesReceipts")}>
          {expandedTransactions.salesReceipts ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900">Sales Receipts</span>
        </div>
        <button
          className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={(event) => {
            event.stopPropagation();
            navigate("/sales/sales-receipts/new", { state: { customerId: customer?.id, customerName: customer?.name } });
          }}
        >
          <Plus size={14} />
          New
        </button>
      </div>
      {expandedTransactions.salesReceipts && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={salesReceiptStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsSalesReceiptStatusDropdownOpen(!isSalesReceiptStatusDropdownOpen)}
              >
                Status: {salesReceiptStatusFilter === "all" ? "All" : salesReceiptStatusFilter.charAt(0).toUpperCase() + salesReceiptStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isSalesReceiptStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "draft", "sent", "paid", "void"].map((status) => (
                    <div
                      key={status}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                        salesReceiptStatusFilter === status ? "bg-blue-50 text-blue-600" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setSalesReceiptStatusFilter(status);
                        setIsSalesReceiptStatusDropdownOpen(false);
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
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">SALES RECEIPT#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredSalesReceipts().length > 0 ? (
                  getFilteredSalesReceipts().map((salesReceipt: any) => (
                    <tr
                      key={salesReceipt.id}
                      onClick={() => navigate(`/sales/sales-receipts/${salesReceipt.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(String(salesReceipt.date || salesReceipt.salesReceiptDate || 0)).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{salesReceipt.salesReceiptNumber || salesReceipt.id}</td>
                      <td className="py-3 px-4 text-gray-900">{salesReceipt.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {formatCurrency(salesReceipt.total || 0, salesReceipt.currency || customer?.currency || "AMD")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${
                            (salesReceipt.status || "").toLowerCase() === "paid"
                              ? "bg-green-100 text-green-700"
                              : (salesReceipt.status || "").toLowerCase() === "sent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {salesReceipt.status || "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no sales receipts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          expandedTransactions.refunds ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTransactionSection("refunds")}>
          {expandedTransactions.refunds ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900">Refunds</span>
        </div>
      </div>
      {expandedTransactions.refunds && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="text-sm text-gray-500">No refunds found.</div>
        </div>
      )}
    </>
  );
}
