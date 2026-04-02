import React from "react";
import { Calendar, ChevronDown, FileText, Loader2, Mail } from "lucide-react";

type CustomerDetailStatementTabProps = {
  customer: any;
  displayName: string;
  organizationProfile: any;
  ownerEmail: any;
  invoices: any[];
  payments: any[];
  creditNotes: any[];
  statementTransactions: any[];
  statementPeriod: string;
  statementFilter: string;
  isStatementPeriodDropdownOpen: boolean;
  isStatementFilterDropdownOpen: boolean;
  isStatementDownloading: boolean;
  statementPeriodDropdownRef: React.RefObject<HTMLDivElement>;
  statementFilterDropdownRef: React.RefObject<HTMLDivElement>;
  onToggleStatementPeriodDropdown: () => void;
  onToggleStatementFilterDropdown: () => void;
  onSelectStatementPeriod: (value: string) => void;
  onSelectStatementFilter: (value: string) => void;
  onDownloadPdf: () => void | Promise<void>;
  onSendEmail: () => void;
  getStatementDateRange: () => { startDate: Date; endDate: Date };
};

const getStatementPeriodLabel = (statementPeriod: string) => {
  switch (statementPeriod) {
    case "this-month":
      return "This Month";
    case "last-month":
      return "Last Month";
    case "this-quarter":
      return "This Quarter";
    case "this-year":
      return "This Year";
    default:
      return "Custom";
  }
};

export default function CustomerDetailStatementTab({
  customer,
  displayName,
  organizationProfile,
  ownerEmail,
  invoices,
  payments,
  creditNotes,
  statementTransactions,
  statementPeriod,
  statementFilter,
  isStatementPeriodDropdownOpen,
  isStatementFilterDropdownOpen,
  isStatementDownloading,
  statementPeriodDropdownRef,
  statementFilterDropdownRef,
  onToggleStatementPeriodDropdown,
  onToggleStatementFilterDropdown,
  onSelectStatementPeriod,
  onSelectStatementFilter,
  onDownloadPdf,
  onSendEmail,
  getStatementDateRange,
}: CustomerDetailStatementTabProps) {
  const periodOptions = ["this-month", "last-month", "this-quarter", "this-year"];
  const filterOptions = ["all", "invoices", "payments", "credit-notes"];
  const { startDate, endDate } = getStatementDateRange();
  const baseCurrency = organizationProfile?.baseCurrency || "KES";
  const openingBalance = parseFloat(String(customer?.openingBalance ?? 0));
  const invoicedAmount = invoices.reduce(
    (sum, invoice) => sum + parseFloat(String(invoice.total || invoice.amount || 0)),
    0,
  );
  const amountReceived = payments.reduce(
    (sum, payment) => sum + parseFloat(String(payment.amountReceived || payment.amount || 0)),
    0,
  );
  const creditNoteAmount = creditNotes.reduce(
    (sum, creditNote) => sum + parseFloat(String(creditNote.total || creditNote.amount || 0)),
    0,
  );
  const balanceDue = openingBalance + invoicedAmount - amountReceived - creditNoteAmount;

  return (
    <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative" ref={statementPeriodDropdownRef}>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
              onClick={onToggleStatementPeriodDropdown}
            >
              <Calendar size={16} />
              {getStatementPeriodLabel(statementPeriod)}
              <ChevronDown size={14} />
            </button>
            {isStatementPeriodDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                {periodOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`block w-full px-4 py-2 text-left text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${
                      statementPeriod === option ? "bg-blue-50 text-blue-600" : ""
                    }`}
                    onClick={() => onSelectStatementPeriod(option)}
                  >
                    {getStatementPeriodLabel(option)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={statementFilterDropdownRef}>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
              onClick={onToggleStatementFilterDropdown}
            >
              Filter By: {statementFilter === "all" ? "All" : statementFilter}
              <ChevronDown size={14} />
            </button>
            {isStatementFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`block w-full px-4 py-2 text-left text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${
                      statementFilter === option ? "bg-blue-50 text-blue-600" : ""
                    }`}
                    onClick={() => onSelectStatementFilter(option)}
                  >
                    {option === "all" ? "All" : option === "credit-notes" ? "Credit Notes" : option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`p-2 bg-white text-[#156372] hover:bg-[#EAF4F6] border border-gray-300 rounded-md transition-colors shadow-sm ${
              isStatementDownloading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="PDF"
            onClick={onDownloadPdf}
            disabled={isStatementDownloading}
          >
            {isStatementDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52] transition-colors shadow-sm"
            onClick={onSendEmail}
          >
            <Mail size={16} />
            Send Email
          </button>
        </div>
      </div>

      <div
        className="bg-white shadow-lg mx-auto print-content"
        style={{ width: "210mm", minHeight: "297mm", padding: "40px", boxSizing: "border-box" }}
      >
        <div className="flex justify-between items-start mb-12">
          <div className="flex gap-6 items-start">
            <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-md bg-gray-50 border border-gray-200">
              {organizationProfile?.logo ? (
                <img
                  src={organizationProfile.logo}
                  alt="Organization Logo"
                  className="w-full h-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <FileText size={30} className="text-gray-400" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="text-[18px] font-bold text-gray-900 mb-1">
                {organizationProfile?.organizationName || organizationProfile?.name || "TABAN ENTERPRISES"}
              </div>
              <div className="text-[14px] text-gray-600 leading-relaxed">
                {organizationProfile?.address?.street1 && <div>{organizationProfile.address.street1}</div>}
                {organizationProfile?.address?.street2 && <div>{organizationProfile.address.street2}</div>}
                <div>
                  {[
                    organizationProfile?.address?.city,
                    organizationProfile?.address?.state,
                    organizationProfile?.address?.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {organizationProfile?.address?.country && <div>{organizationProfile.address.country}</div>}
                <div className="mt-1">{ownerEmail?.email || organizationProfile?.email || ""}</div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-[32px] font-bold text-gray-900 mb-2">STATEMENT</h2>
            <div className="text-[14px] text-gray-600">
              {`${startDate.toLocaleDateString("en-GB")} To ${endDate.toLocaleDateString("en-GB")}`}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="text-[14px] font-bold text-gray-900 mb-2">To</div>
          <div className="text-[16px] font-medium text-blue-600">{displayName}</div>
        </div>

        <div className="mb-10 w-[300px] ml-auto">
          <div className="border-t border-b border-gray-200 divide-y divide-gray-100">
            <div className="flex justify-between py-2 text-[13px]">
              <span className="text-gray-600">Opening Balance</span>
              <span className="font-medium text-gray-900">
                {baseCurrency}{" "}
                {openingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between py-2 text-[13px]">
              <span className="text-gray-600">Invoiced Amount</span>
              <span className="font-medium text-gray-900">
                {baseCurrency}{" "}
                {invoicedAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between py-2 text-[13px]">
              <span className="text-gray-600">Amount Received</span>
              <span className="font-medium text-gray-900">
                {baseCurrency}{" "}
                {amountReceived.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-900 mt-1">
            <span className="text-[14px] font-bold text-gray-900">Balance Due</span>
            <span className="text-[14px] font-bold text-gray-900">
              {baseCurrency}{" "}
              {balanceDue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="mb-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#3d3d3d]">
                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Date</th>
                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Transactions</th>
                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Details</th>
                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Amount</th>
                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Payments</th>
                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Balance</th>
              </tr>
            </thead>
            <tbody>
              {openingBalance !== 0 && (
                <tr className="bg-white">
                  <td className="py-3 px-4 text-[13px] text-gray-900">01 Jan {new Date().getFullYear()}</td>
                  <td className="py-3 px-4 text-[13px] text-gray-900">***Opening Balance***</td>
                  <td className="py-3 px-4 text-[13px] text-gray-600"></td>
                  <td className="py-3 px-4 text-[13px] text-gray-900 text-right">
                    {openingBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-gray-900 text-right">0.00</td>
                  <td className="py-3 px-4 text-[13px] text-gray-900 text-right">
                    {openingBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}
              {statementTransactions.map((transaction, index) => {
                const rowIndex = openingBalance !== 0 ? index + 1 : index;
                const isEven = rowIndex % 2 === 0;
                return (
                  <tr key={transaction.id} className={isEven ? "bg-white" : "bg-gray-50"}>
                    <td className="py-3 px-4 text-[13px] text-gray-900">
                      {new Date(transaction.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-gray-900">{transaction.type}</td>
                    <td className="py-3 px-4 text-[13px] text-blue-600">{transaction.detailsLink || ""}</td>
                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">
                      {transaction.amount !== 0
                        ? transaction.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">
                      {transaction.payments !== 0
                        ? transaction.payments.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">
                      {transaction.balance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-16 py-4 px-4 border-t-2 border-gray-300 mt-2">
          <div className="text-[14px] font-bold text-gray-900">Balance Due</div>
          <div className="text-[14px] font-bold text-gray-900">
            ${" "}
            {statementTransactions.length > 0
              ? statementTransactions[statementTransactions.length - 1].balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : openingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
