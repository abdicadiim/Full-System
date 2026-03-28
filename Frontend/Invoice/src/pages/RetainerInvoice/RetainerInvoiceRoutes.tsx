import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { invoicesAPI } from "../../services/api";
import NewRetailInvoice from "./NewRetailInvoice/NewRetailInvoice";

const isRetainerRow = (row: any) => {
  const number = String(row?.invoiceNumber || row?.number || "").toUpperCase();
  const type = String(row?.invoiceType || row?.type || "").toLowerCase();
  return type.includes("retainer") || number.startsWith("RET-");
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
                    <td className="px-4 py-3">{row?.status || "draft"}</td>
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
            onClick={() => navigate(`/sales/retainer-invoices/${id}/edit`)}
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
