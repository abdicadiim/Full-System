import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Retainer Invoices</h1>
        <button
          onClick={() => navigate("/sales/retainer-invoices/new")}
          className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-[#156372] to-[#0D4A52] hover:opacity-90"
        >
          New
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-slate-600">No retainer invoices yet.</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f6f7fb]">
              <tr className="text-xs text-slate-500 uppercase">
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
                  onClick={() => navigate(`/sales/retainer-invoices/${row?._id || row?.id}`)}
                  className="border-t border-gray-100 text-sm hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3">{String(row?.invoiceDate || row?.date || "").slice(0, 10)}</td>
                  <td className="px-4 py-3 text-[#156372] font-medium">{row?.invoiceNumber || "-"}</td>
                  <td className="px-4 py-3">{row?.customerName || row?.customer?.displayName || row?.customer?.name || "-"}</td>
                  <td className="px-4 py-3">{Number(row?.total || row?.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{row?.status || "draft"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RetainerInvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);

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

  if (!row) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  const invoiceId = String(row?.id || row?._id || id || "");
  const customerName = String(
    row?.customerName ||
    (typeof row?.customer === "string"
      ? row?.customer
      : row?.customer?.displayName || row?.customer?.companyName || row?.customer?.name || "") ||
    ""
  );

  const handleRecordPayment = () => {
    navigate("/payments/payments-received/new", {
      state: {
        source: "retainer-invoice",
        invoiceId,
        invoiceNumber: String(row?.invoiceNumber || invoiceId),
        customerId: String(
          row?.customerId ||
          row?.customer?._id ||
          row?.customer?.id ||
          (typeof row?.customer === "string" ? row.customer : "") ||
          ""
        ),
        customerName,
        amountDue: Number(row?.balance ?? row?.balanceDue ?? row?.total ?? row?.amount ?? 0) || 0,
        totalAmount: Number(row?.total ?? row?.amount ?? 0) || 0,
        amount: Number(row?.balance ?? row?.balanceDue ?? row?.total ?? row?.amount ?? 0) || 0,
        currency: String(row?.currency || "USD"),
        location: String(row?.location || row?.selectedLocation || row?.branch || "Head Office"),
        invoice: row,
        showOnlyInvoice: true,
        returnInvoiceId: invoiceId
      }
    });
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900">Retainer Invoice {row?.invoiceNumber || ""}</h1>
      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div>Customer: {row?.customerName || row?.customer?.displayName || row?.customer?.name || "-"}</div>
        <div>Date: {String(row?.invoiceDate || row?.date || "").slice(0, 10)}</div>
        <div>Reference: {row?.referenceNumber || "-"}</div>
        <div>Amount: {Number(row?.total || row?.amount || 0).toLocaleString()}</div>
        <div>Status: {row?.status || "draft"}</div>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={handleRecordPayment}
          className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-[#156372] to-[#0D4A52] hover:opacity-90"
        >
          Record Payment
        </button>
        <button
          onClick={() => navigate(`/sales/retainer-invoices/${id}/edit`)}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => navigate("/sales/retainer-invoices")}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>
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
