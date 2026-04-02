import React, { useEffect, useState } from "react";
import { AlertTriangle, Banknote, ChevronRight, RotateCw, X } from "lucide-react";

export default function InvoicePaymentModals(props: any) {
  const {
    invoice,
    formatCurrency,
    formatDate,
    toNumber,
    isApplyAdjustmentsModalOpen,
    setIsApplyAdjustmentsModalOpen,
    isApplyingAdjustments,
    applyAdjustmentRows,
    useApplyDate,
    setUseApplyDate,
    applyOnDate,
    setApplyOnDate,
    invoiceTotalsMeta,
    applyAdjustmentValues,
    handleAdjustmentValueChange,
    handleApplyAdjustments,
    showDeletePaymentModal,
    setShowDeletePaymentModal,
    selectedPaymentForDelete,
    setSelectedPaymentForDelete,
    isDeletingPayment,
    handleDissociateAndAddAsCredit,
    handleDeleteRecordedPayment,
    isRefundModalOpen,
    selectedPaymentForRefund,
    handleCloseRefundModal,
    bankAccounts,
    getAccountId,
    getAccountDisplayName,
    refundData,
    setRefundData,
    refundPaymentModeOptions,
    isSavingRefund,
    handleRefundSave,
    isDeleteInvoiceModalOpen,
    setIsDeleteInvoiceModalOpen,
    handleConfirmDeleteInvoice,
    isRecordPaymentModalOpen,
    setIsRecordPaymentModalOpen,
    handleRecordPaymentConfirm,
  } = props;

  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    if (isRecordPaymentModalOpen) {
      setDoNotShowAgain(false);
    }
  }, [isRecordPaymentModalOpen]);

  const closeDeletePaymentModal = () => {
    if (isDeletingPayment) return;
    setShowDeletePaymentModal(false);
    setSelectedPaymentForDelete(null);
  };

  return (
    <>
      {isApplyAdjustmentsModalOpen && invoice && (
        <div className="fixed inset-0 z-[130] bg-black/40 flex items-start justify-center pt-8 px-4">
          <div className="w-full max-w-[900px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900">
                Apply credits to {String(invoice?.invoiceNumber || "")}
              </h3>
              <button
                className="text-red-500 hover:text-red-600"
                onClick={() => {
                  if (isApplyingAdjustments) return;
                  setIsApplyAdjustmentsModalOpen(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[15px] font-medium text-gray-800">Credits to Apply</h4>
                <div className="flex items-center gap-3 text-[13px] text-gray-700">
                  <span>Set Applied on Date</span>
                  <button
                    type="button"
                    onClick={() => setUseApplyDate((prev: boolean) => !prev)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      useApplyDate ? "bg-[#1f6f84]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                        useApplyDate ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                  {useApplyDate && (
                    <input
                      type="date"
                      value={applyOnDate}
                      onChange={(event) => setApplyOnDate(event.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-[14px]"
                    />
                  )}
                  <span>
                    Invoice Balance:{" "}
                    <span className="font-semibold">
                      {formatCurrency(invoiceTotalsMeta.balance, invoice.currency)}
                      {` (${formatDate(invoice?.invoiceDate || new Date().toISOString())})`}
                    </span>
                  </span>
                </div>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#f6f7fb]">
                    <tr className="text-[12px] uppercase text-[#6b7280]">
                      <th className="px-3 py-2 font-medium">Transaction#</th>
                      <th className="px-3 py-2 font-medium">Transaction Date</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium text-right">Credit Amount</th>
                      <th className="px-3 py-2 font-medium text-right">Credits Available</th>
                      <th className="px-3 py-2 font-medium">Credits Applied Date</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Early Payment Discount
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Credits to Apply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applyAdjustmentRows.map((row: any, index: number) => (
                      <tr key={row.rowKey || index} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-[12px] text-gray-800">
                          {row.transactionNumber}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-800">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-800">
                          {row.location || "Head Office"}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right text-gray-900">
                          {formatCurrency(row.creditAmount, invoice.currency)}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right text-gray-900">
                          {formatCurrency(row.availableAmount, invoice.currency)}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-gray-800">
                          {formatDate(useApplyDate ? applyOnDate : new Date().toISOString())}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right text-gray-900">
                          {formatCurrency(0, invoice.currency)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={applyAdjustmentValues[row.rowKey] ?? 0}
                            onChange={(event) =>
                              handleAdjustmentValueChange(
                                row.rowKey,
                                event.target.value,
                                Number(row.availableAmount || 0),
                              )
                            }
                            placeholder="Enter amount"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-right text-[12px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="w-[290px] bg-[#f8fafc] border border-gray-200 rounded p-3 text-[13px] space-y-2">
                  <div className="flex justify-between">
                    <span>Amount to Credit:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        Object.values(applyAdjustmentValues).reduce(
                          (sum: number, value: any) => sum + toNumber(value),
                          0,
                        ),
                        invoice.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discount:</span>
                    <span>{formatCurrency(0, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Balance Due:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        Math.max(
                          0,
                          invoiceTotalsMeta.balance -
                            Object.values(applyAdjustmentValues).reduce(
                              (sum: number, value: any) => sum + toNumber(value),
                              0,
                            ),
                        ),
                        invoice.currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                disabled={isApplyingAdjustments}
                onClick={() => void handleApplyAdjustments()}
                className="px-4 py-2 rounded text-white text-[14px] font-medium bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60"
              >
                {isApplyingAdjustments ? "Applying..." : "Apply Credits"}
              </button>
              <button
                type="button"
                disabled={isApplyingAdjustments}
                onClick={() => setIsApplyAdjustmentsModalOpen(false)}
                className="px-4 py-2 rounded border border-gray-300 text-[14px] text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePaymentModal && selectedPaymentForDelete && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-start justify-center pt-12">
          <div className="w-full max-w-[560px] bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[22px] font-medium text-gray-900 leading-none">
                Delete Recorded Payment?
              </h3>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                onClick={closeDeletePaymentModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center mt-1">
                  <AlertTriangle size={20} />
                </div>
                <p className="text-[12px] text-gray-700 leading-6">
                  You&apos;re deleting a payment of{" "}
                  {formatCurrency(
                    selectedPaymentForDelete.amountReceived ??
                      selectedPaymentForDelete.amount ??
                      0,
                    selectedPaymentForDelete.currency || invoice?.currency,
                  )}
                  . You can either dissociate this payment from this invoice and add it as a
                  credit to the customer, or delete this payment entirely.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  disabled={isDeletingPayment}
                  className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-60 disabled:cursor-not-allowed text-left px-4 py-2.5 rounded-lg text-[14px] text-gray-700 flex items-center justify-between"
                  onClick={() => {
                    void handleDissociateAndAddAsCredit();
                  }}
                >
                  <span>Dissociate & Add As Credit</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  disabled={isDeletingPayment}
                  className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-60 disabled:cursor-not-allowed text-left px-4 py-2.5 rounded-lg text-[14px] text-gray-700 flex items-center justify-between"
                  onClick={() => {
                    void handleDeleteRecordedPayment();
                  }}
                >
                  <span>{isDeletingPayment ? "Deleting Payment..." : "Delete Payment"}</span>
                  {isDeletingPayment ? (
                    <RotateCw size={16} className="animate-spin" />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRefundModalOpen && selectedPaymentForRefund && (
        <div
          className="fixed inset-0 z-[120] bg-black/40 flex items-start justify-center pt-8 px-4"
          onClick={handleCloseRefundModal}
        >
          <div
            className="w-full max-w-[1100px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[22px] font-medium text-gray-900 leading-none">Refund</h3>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                onClick={handleCloseRefundModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                  <Banknote size={18} />
                </div>
                <div>
                  <div className="text-[13px] text-gray-500">Customer Name</div>
                  <div className="text-[18px] font-medium text-gray-900">
                    {selectedPaymentForRefund.customerName ||
                      invoice?.customerName ||
                      invoice?.customer ||
                      "-"}
                  </div>
                </div>
              </div>

              <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-5">
                <label className="block text-[14px] font-medium text-gray-700 mb-2">
                  Total Refund Amount
                </label>
                <div className="max-w-[320px] flex border border-gray-300 rounded-md overflow-hidden bg-white">
                  <div className="px-3 flex items-center text-[14px] text-gray-600 border-r border-gray-300 bg-gray-50">
                    {String(
                      selectedPaymentForRefund.currency || invoice?.currency || "USD",
                    ).slice(0, 3)}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={
                      Number(
                        selectedPaymentForRefund.amountReceived ??
                          selectedPaymentForRefund.amount ??
                          0,
                      ) || 0
                    }
                    value={refundData.amount}
                    onChange={(event) =>
                      setRefundData((prev: any) => ({ ...prev, amount: event.target.value }))
                    }
                    className="flex-1 px-3 py-2.5 text-[14px] text-gray-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                <div>
                  <label className="block text-[14px] text-gray-700 mb-2">
                    Refunded On<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={refundData.refundedOn}
                    onChange={(event) =>
                      setRefundData((prev: any) => ({
                        ...prev,
                        refundedOn: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] text-gray-700 mb-2">Payment Mode</label>
                  <select
                    value={refundData.paymentMode}
                    onChange={(event) =>
                      setRefundData((prev: any) => ({
                        ...prev,
                        paymentMode: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] bg-white"
                  >
                    {refundPaymentModeOptions.map((mode: string) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] text-gray-700 mb-2">Reference#</label>
                  <input
                    type="text"
                    value={refundData.referenceNumber}
                    onChange={(event) =>
                      setRefundData((prev: any) => ({
                        ...prev,
                        referenceNumber: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] text-gray-700 mb-2">
                    From Account<span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={refundData.fromAccountId || refundData.fromAccount}
                    onChange={(event) => {
                      const selected = bankAccounts.find((account: any) => {
                        const accountId = getAccountId(account);
                        const accountName = getAccountDisplayName(account);
                        return (
                          accountId === event.target.value || accountName === event.target.value
                        );
                      });

                      setRefundData((prev: any) => ({
                        ...prev,
                        fromAccount: selected
                          ? getAccountDisplayName(selected)
                          : event.target.value,
                        fromAccountId: selected ? getAccountId(selected) : "",
                      }));
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] bg-white"
                  >
                    <option value="">Select account</option>
                    {bankAccounts.map((account: any, index: number) => {
                      const accountId = getAccountId(account) || `account-${index}`;
                      const accountName =
                        getAccountDisplayName(account) || `Account ${index + 1}`;

                      return (
                        <option key={accountId} value={accountId}>
                          {accountName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="md:col-span-2 max-w-[420px]">
                  <label className="block text-[14px] text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={refundData.description}
                    onChange={(event) =>
                      setRefundData((prev: any) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 text-[13px] text-gray-500">
                Note: Once you save this refund, the payment received will be dissociated from
                the related invoice(s), changing the invoice status to Unpaid.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                disabled={isSavingRefund}
                onClick={handleRefundSave}
                className="px-5 py-2 bg-[#3b82f6] text-white rounded-md text-[14px] font-medium hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingRefund ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                disabled={isSavingRefund}
                onClick={handleCloseRefundModal}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-md text-[14px] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteInvoiceModalOpen && (
        <div
          className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16"
          onClick={() => setIsDeleteInvoiceModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                Delete invoice?
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setIsDeleteInvoiceModalOpen(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              You cannot retrieve this invoice once it has been deleted.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-red-600 text-white text-[12px] hover:bg-red-700"
                onClick={handleConfirmDeleteInvoice}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                onClick={() => setIsDeleteInvoiceModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isRecordPaymentModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsRecordPaymentModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  Invoice status will be changed to &apos;Sent&apos; once the payment is
                  recorded.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={doNotShowAgain}
                  onChange={(event) => setDoNotShowAgain(event.target.checked)}
                />
                <span>Do not show this again</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={() => handleRecordPaymentConfirm(doNotShowAgain)}
              >
                OK
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                onClick={() => setIsRecordPaymentModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
