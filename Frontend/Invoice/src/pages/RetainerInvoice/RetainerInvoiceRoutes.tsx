import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { invoicesAPI } from "../../services/api";
import { getPayments } from "../salesModel";
import NewRetailInvoice from "./NewRetailInvoice/NewRetailInvoice";

const isRetainerRow = (row: any) => {
  const number = String(row?.invoiceNumber || row?.number || "").toUpperCase();
  const type = String(row?.invoiceType || row?.type || "").toLowerCase();
  return type.includes("retainer") || number.startsWith("RET-");
};

const getStatusBadgeClass = (status: string) => {
  const s = String(status || "").toLowerCase();
  const statusClasses: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    sent: "bg-blue-50 text-blue-600 border-blue-100",
    overdue: "bg-amber-50 text-amber-600 border-amber-100",
    partially_paid: "bg-orange-50 text-orange-600 border-orange-100",
    unpaid: "bg-slate-100 text-slate-600 border-slate-200",
    void: "bg-red-50 text-red-600 border-red-100",
  };
  return statusClasses[s] || "bg-slate-100 text-slate-600 border-slate-200";
};

function RetainerInvoicesHome() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await invoicesAPI.getAll({ limit: 1000 });
        const allRows = Array.isArray(res?.data) ? res.data : [];
        setRows(allRows.filter(isRetainerRow));
      } catch (error) {
        console.error("Failed to load retainer invoices:", error);
        toast.error("Failed to load retainer invoices.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const list = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b?.invoiceDate || b?.date || b?.createdAt || 0).getTime() -
          new Date(a?.invoiceDate || a?.date || a?.createdAt || 0).getTime()
      ),
    [rows]
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <h1 className="text-[18px] font-semibold text-slate-900">Retainer Invoices</h1>
        <button
          onClick={() => navigate("/sales/retainer-invoices/new")}
          className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-[#156372] to-[#0D4A52] hover:opacity-90"
        >
          New
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        {loading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-slate-600">No retainer invoices yet.</div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead className="bg-[#f6f7fb]">
                <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Retainer #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={String(row?._id || row?.id || row?.invoiceNumber)}
                    onClick={() =>
                      navigate(`/sales/retainer-invoices/${row?._id || row?.id}`, {
                        state: { row },
                      })
                    }
                    className="border-t border-gray-100 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      {String(row?.invoiceDate || row?.date || "").slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-[#156372] font-medium">
                      {row?.invoiceNumber || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row?.customerName || row?.customer?.displayName || row?.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {Number(row?.total || row?.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${getStatusBadgeClass(row?.status || "draft")}`}>
                        {String(row?.status || "draft").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RetainerInvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [row, setRow] = useState<any>(() => (location.state as any)?.row || null);
  const [payments, setPayments] = useState<any[]>([]);
  const [appliedInvoices, setAppliedInvoices] = useState<any[]>([]);
  const [infoTab, setInfoTab] = useState<"payments" | "retainer">("payments");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await invoicesAPI.getById(String(id || ""));
        if (res?.success && res?.data) setRow(res.data);
      } catch (error) {
        console.error("Failed to load retainer invoice:", error);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const loadRelated = async () => {
      try {
        const current = row || {};
        const retainerId = String(current?.id || current?._id || id || "").trim();
        const retainerNumber = String(current?.invoiceNumber || current?.retainerNumber || "").trim();

        const allPayments = await getPayments();
        const linkedPayments = (Array.isArray(allPayments) ? allPayments : []).filter((payment) =>
          isPaymentLinkedToRetainer(payment, current, id)
        );
        setPayments(linkedPayments);

        const invRes = await invoicesAPI.getAll({ limit: 10000 });
        const allInvoices = Array.isArray(invRes?.data) ? invRes.data : [];
        const appliedRows: any[] = [];

        allInvoices.forEach((invoice: any) => {
          const apps = Array.isArray(invoice?.retainerApplications)
            ? invoice.retainerApplications
            : [];
          apps.forEach((app: any) => {
            const appRetainerId = String(app?.retainerId || app?.retainer?._id || app?.retainer?.id || "").trim();
            const appRetainerNumber = String(app?.retainerNumber || app?.retainerInvoiceNumber || "").trim();
            if (
              (retainerId && appRetainerId && retainerId === appRetainerId) ||
              (retainerNumber && appRetainerNumber && retainerNumber === appRetainerNumber)
            ) {
              appliedRows.push({
                id: String(invoice?.id || invoice?._id || app?.id || appRetainerId),
                date: app?.date || app?.appliedDate || invoice?.invoiceDate || invoice?.date || "",
                invoiceId: String(invoice?.id || invoice?._id || ""),
                invoiceNumber: String(invoice?.invoiceNumber || invoice?.number || "-"),
                amountApplied: Number(app?.applied ?? app?.amount ?? app?.appliedAmount ?? 0),
              });
            }
          });

          if (!apps.length) {
            const invoiceRetainerId = String(invoice?.retainerId || invoice?.retainerInvoiceId || "").trim();
            const retainerAppliedAmount = Number(
              invoice?.retainerAppliedAmount ??
              invoice?.retainersApplied ??
              invoice?.retainerAmountApplied ??
              invoice?.retainerAppliedTotal ??
              0
            );
            if (
              retainerAppliedAmount > 0 &&
              ((retainerId && invoiceRetainerId && retainerId === invoiceRetainerId) ||
                (retainerNumber && String(invoice?.retainerNumber || "").trim() === retainerNumber))
            ) {
              appliedRows.push({
                id: String(invoice?.id || invoice?._id || retainerId),
                date: invoice?.invoiceDate || invoice?.date || "",
                invoiceId: String(invoice?.id || invoice?._id || ""),
                invoiceNumber: String(invoice?.invoiceNumber || invoice?.number || "-"),
                amountApplied: retainerAppliedAmount,
              });
            }
          }
        });

        setAppliedInvoices(appliedRows);
        if (appliedRows.length > 0 && linkedPayments.length === 0) {
          setInfoTab("retainer");
        }
      } catch (error) {
        console.error("Failed to load retainer invoice related data:", error);
      }
    };

    loadRelated();
  }, [id, row]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    const mainEl = document.querySelector("main") as HTMLElement | null;
    const prevMainOverflow = mainEl?.style.overflow;
    const prevMainHeight = mainEl?.style.height;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
      mainEl.style.height = "100%";
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow || "";
        mainEl.style.height = prevMainHeight || "";
      }
    };
  }, []);

  const safeRow = row || {};
  const retainerDrawStatus = String(
    safeRow?.retainerDrawStatus || safeRow?.drawStatus || ""
  ).trim();

  const formatDate = (value: any) => {
    if (!value) return "-";
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return String(value).slice(0, 10);
    }
  };

  const getAppliedAmountsByInvoice = (paymentRow: any): Record<string, number> => {
    const map: Record<string, number> = {};
    if (!paymentRow || typeof paymentRow !== "object") return map;

    if (paymentRow.invoicePayments && typeof paymentRow.invoicePayments === "object") {
      Object.entries(paymentRow.invoicePayments).forEach(([invoiceId, amount]) => {
        const key = String(invoiceId || "").trim();
        const val = Number(amount || 0);
        if (key && val > 0) map[key] = val;
      });
      if (Object.keys(map).length > 0) return map;
    }

    if (Array.isArray(paymentRow.allocations)) {
      paymentRow.allocations.forEach((allocation: any) => {
        const invoiceId = String(allocation?.invoice?._id || allocation?.invoice?.id || allocation?.invoice || "").trim();
        const amount = Number(allocation?.amount || 0);
        if (!invoiceId || amount <= 0) return;
        map[invoiceId] = (map[invoiceId] || 0) + amount;
      });
      if (Object.keys(map).length > 0) return map;
    }

    const fallbackInvoiceId = String(paymentRow.invoiceId || "").trim();
    const fallbackAmount = Number(paymentRow.amount || paymentRow.amountReceived || 0);
    if (fallbackInvoiceId && fallbackAmount > 0) map[fallbackInvoiceId] = fallbackAmount;
    return map;
  };

  const isPaymentLinkedToRetainer = (paymentRow: any, currentInvoice: any, routeInvoiceId: any) => {
    const targetIds = new Set(
      [routeInvoiceId, currentInvoice?.id, currentInvoice?._id]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    );
    const targetNumber = String(currentInvoice?.invoiceNumber || "").trim().toLowerCase();

    const directInvoiceId = String(paymentRow?.invoiceId || "").trim();
    const directInvoiceNumber = String(paymentRow?.invoiceNumber || "").trim().toLowerCase();
    if ((directInvoiceId && targetIds.has(directInvoiceId)) || (targetNumber && directInvoiceNumber === targetNumber)) {
      return true;
    }

    const byMap = getAppliedAmountsByInvoice(paymentRow);
    if (Object.keys(byMap).some((invoiceId) => targetIds.has(String(invoiceId || "").trim()))) {
      return true;
    }

    if (Array.isArray(paymentRow?.allocations)) {
      return paymentRow.allocations.some((allocation: any) => {
        const allocationInvoiceId = String(
          allocation?.invoiceId ||
          allocation?.invoice?._id ||
          allocation?.invoice?.id ||
          allocation?.invoice ||
          ""
        ).trim();
        const allocationInvoiceNumber = String(
          allocation?.invoiceNumber ||
          allocation?.invoice?.invoiceNumber ||
          ""
        ).trim().toLowerCase();
        return (
          (allocationInvoiceId && targetIds.has(allocationInvoiceId)) ||
          (targetNumber && allocationInvoiceNumber === targetNumber)
        );
      });
    }

    return false;
  };

  const invoiceId = String(safeRow?.id || safeRow?._id || id || "");
  const customerName = String(
    safeRow?.customerName ||
    (typeof safeRow?.customer === "string"
      ? safeRow?.customer
      : safeRow?.customer?.displayName || safeRow?.customer?.companyName || safeRow?.customer?.name || "") ||
    ""
  );

  const handleRecordPayment = () => {
    navigate("/payments/payments-received/new", {
      state: {
        source: "retainer-invoice",
        invoiceId,
        invoiceNumber: String(safeRow?.invoiceNumber || invoiceId),
        customerId: String(
          safeRow?.customerId ||
          safeRow?.customer?._id ||
          safeRow?.customer?.id ||
          (typeof safeRow?.customer === "string" ? safeRow.customer : "") ||
          ""
        ),
        customerName,
        amountDue: Number(safeRow?.balance ?? safeRow?.balanceDue ?? safeRow?.total ?? safeRow?.amount ?? 0) || 0,
        totalAmount: Number(safeRow?.total ?? safeRow?.amount ?? 0) || 0,
        amount: Number(safeRow?.balance ?? safeRow?.balanceDue ?? safeRow?.total ?? safeRow?.amount ?? 0) || 0,
        currency: String(safeRow?.currency || "USD"),
        location: String(safeRow?.location || safeRow?.selectedLocation || safeRow?.branch || "Head Office"),
        invoice: safeRow,
        showOnlyInvoice: true,
        returnInvoiceId: invoiceId
      }
    });
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] min-h-0 flex bg-[#f8fafc] overflow-hidden">
      <aside className="w-[320px] lg:w-[320px] md:w-[270px] border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden hidden md:flex">
        <div className="flex items-center justify-between px-4 h-[74px] border-b border-gray-200">
          <button className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
            All Retainer Invoices
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100 bg-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[13px] font-semibold text-gray-900 truncate">
                {customerName || "Customer"}
              </div>
              <div className="text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                {Number(row?.total || row?.amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              {String(row?.invoiceNumber || "-")} · {String(row?.invoiceDate || row?.date || "").slice(0, 10)}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase text-[#156372]">
              {String(row?.status || "draft")}
            </div>
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 h-[74px] flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm text-gray-600 truncate">
              Location: <span className="text-[#3b5ba9]">{String(row?.location || row?.selectedLocation || "Head Office")}</span>
            </div>
            <h1 className="text-lg md:text-[24px] leading-tight font-semibold text-gray-900 truncate">
              {row?.invoiceNumber || "Retainer Invoice"}
            </h1>
          </div>
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
            onClick={() => navigate("/sales/retainer-invoices")}
          >
            Back
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-2 md:p-3 border-b border-gray-200 bg-[#f8fafc]">
          <button
            onClick={() =>
              navigate(`/sales/retainer-invoices/${id}/edit`, {
                state: { row: safeRow },
              })
            }
            className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium hover:text-[#2F80FF]"
          >
            Edit
          </button>
          <button
            onClick={handleRecordPayment}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium hover:text-[#2F80FF]"
          >
            Record Payment
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-[#f8fafc]">
          {(payments.length > 0 || appliedInvoices.length > 0) && (
            <div className="mx-6 mt-4 rounded border border-gray-200 bg-white">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2 text-left"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setInfoTab("payments")}
                    className={`flex items-center gap-2 pb-1 border-b-2 text-[12px] ${infoTab === "payments" ? "border-[#2563eb]" : "border-transparent"}`}
                  >
                    <span className="text-[12px] font-medium text-gray-800">Payments Received</span>
                    <span className="text-[12px] text-[#2563eb]">{payments.length}</span>
                  </button>
                  <div className="h-4 w-px bg-gray-300" />
                  <button
                    type="button"
                    onClick={() => setInfoTab("retainer")}
                    className={`flex items-center gap-2 pb-1 border-b-2 text-[12px] ${infoTab === "retainer" ? "border-[#2563eb]" : "border-transparent"}`}
                  >
                    <span className="text-[12px] font-medium text-gray-800">Retainer Applied Invoices</span>
                    <span className="text-[12px] text-[#2563eb]">{appliedInvoices.length}</span>
                  </button>
                </div>
                <span className="text-gray-400 text-[12px]">▼</span>
              </button>
              <div className="border-t border-gray-200 overflow-x-auto">
                {infoTab === "payments" ? (
                  <table className="w-full text-left">
                    <thead className="bg-[#f6f7fb]">
                      <tr className="text-[12px] text-[#6b7280] uppercase">
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Payment #</th>
                        <th className="px-4 py-2 font-medium">Reference#</th>
                        <th className="px-4 py-2 font-medium">Payment Mode</th>
                        <th className="px-4 py-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length > 0 ? payments.map((payment: any, index: number) => (
                        <tr key={String(payment?.id || payment?._id || index)} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-[12px] text-gray-800">{formatDate(payment.paymentDate || payment.date)}</td>
                          <td className="px-4 py-3 text-[12px] text-[#2563eb]">{payment.paymentNumber || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-700">{payment.referenceNumber || payment.paymentReference || payment.reference || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-700">{payment.paymentMode || payment.paymentMethod || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-900">{Number(payment.amountReceived ?? payment.amount ?? 0).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-[12px] text-gray-500 text-center">No payments received.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-[#f6f7fb]">
                      <tr className="text-[12px] text-[#6b7280] uppercase">
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Invoice Number</th>
                        <th className="px-4 py-2 font-medium">Amount Applied</th>
                        <th className="px-4 py-2 font-medium w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {appliedInvoices.length > 0 ? appliedInvoices.map((item: any, index: number) => (
                        <tr key={String(item?.id || index)} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-[12px] text-gray-800">{formatDate(item.date)}</td>
                          <td className="px-4 py-3 text-[12px] text-[#2563eb]">{item.invoiceNumber || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-900">{Number(item.amountApplied || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            {item.invoiceId && (
                              <button
                                type="button"
                                className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                onClick={() => navigate(`/sales/invoices/${item.invoiceId}`)}
                              >
                                Show Details
                              </button>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-[12px] text-gray-500 text-center">No applied invoices.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          <div className="h-full max-w-[980px] mx-auto px-4 py-4 overflow-hidden">
            <div className="w-full max-w-[920px] mx-auto bg-white border border-[#d1d5db] shadow-sm overflow-hidden">
              <div className="px-10 py-10">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="text-[28px] font-semibold text-slate-900">Retainer Invoice</div>
                    <div className="text-sm text-slate-600 mt-1">#{row?.invoiceNumber || "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Amount</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {Number(row?.total || row?.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-700 border-t border-slate-200 pt-6">
                  <div className="space-y-2">
                    <div><span className="text-slate-500">Customer:</span> {customerName || "-"}</div>
                    <div><span className="text-slate-500">Date:</span> {String(row?.invoiceDate || row?.date || "").slice(0, 10)}</div>
                    <div><span className="text-slate-500">Reference:</span> {row?.referenceNumber || "-"}</div>
                  </div>
                  <div className="space-y-2 md:text-right">
                    <div><span className="text-slate-500">Status:</span> {row?.status || "draft"}</div>
                    <div><span className="text-slate-500">Balance:</span> {Number(row?.balance ?? row?.balanceDue ?? row?.total ?? row?.amount ?? 0).toLocaleString()}</div>
                    <div><span className="text-slate-500">Currency:</span> {String(row?.currency || "USD")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function RetainerInvoiceRoutes() {
  return (
    <Routes>
      <Route index element={<RetainerInvoicesHome />} />
      <Route path="new" element={<NewRetailInvoice />} />
      <Route path=":id/edit" element={<NewRetailInvoice />} />
      <Route path=":id" element={<RetainerInvoiceDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
