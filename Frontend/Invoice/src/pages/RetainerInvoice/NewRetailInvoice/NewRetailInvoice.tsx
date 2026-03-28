import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getInvoiceById, saveInvoice, updateInvoice } from "../../salesModel";
import { customersAPI, invoicesAPI } from "../../../services/api";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewRetailInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    invoiceNumber: "RET-00001",
    customerId: "",
    customerName: "",
    invoiceDate: todayISO(),
    referenceNumber: "",
    amount: "0",
    status: "draft",
  });

  const applyRowToForm = (row: any) => {
    if (!row) return;
    setForm({
      invoiceNumber: String(row?.invoiceNumber || "RET-00001"),
      customerId: String(row?.customerId || row?.customer?._id || row?.customer?.id || ""),
      customerName: String(row?.customerName || row?.customer?.displayName || row?.customer?.name || ""),
      invoiceDate: String(row?.invoiceDate || row?.date || todayISO()).slice(0, 10),
      referenceNumber: String(row?.referenceNumber || ""),
      amount: String(row?.total || row?.amount || 0),
      status: String(row?.status || "draft"),
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [customersRes, nextNumberRes] = await Promise.all([
          customersAPI.getAll({ limit: 1000 }),
          invoicesAPI.getNextNumber("RET-"),
        ]);

        const customerRows = Array.isArray(customersRes?.data) ? customersRes.data : [];
        setCustomers(customerRows);

        if (!isEditMode && nextNumberRes?.success) {
          const nextNo = String(nextNumberRes?.data?.nextNumber || "RET-00001");
          setForm((prev) => ({ ...prev, invoiceNumber: nextNo }));
        }

        if (isEditMode && id) {
          const cachedRow = (location.state as any)?.row;
          if (cachedRow) {
            applyRowToForm(cachedRow);
          }

          const apiRes = await invoicesAPI.getById(String(id));
          const row = apiRes?.data || (await getInvoiceById(id));
          if (row) applyRowToForm(row);
        }
      } catch (error) {
        console.error("Error loading retainer invoice form:", error);
        toast.error("Failed to load retainer invoice form.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEditMode, location.state]);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c: any) => String(c?.id || c?._id) === customerId);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: String(customer?.displayName || customer?.name || customer?.companyName || ""),
    }));
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (saving) return;
    if (!form.customerId) {
      toast.error("Please select a customer.");
      return;
    }

    setSaving(true);
    try {
      const amount = Number(form.amount || 0);
      const payload: any = {
        invoiceType: "retainer",
        type: "retainer",
        invoiceNumber: form.invoiceNumber,
        customerId: form.customerId,
        customerName: form.customerName,
        invoiceDate: form.invoiceDate,
        date: form.invoiceDate,
        referenceNumber: form.referenceNumber,
        status,
        amount,
        total: amount,
        subtotal: amount,
        balanceDue: amount,
        items: [],
      };

      if (isEditMode && id) {
        await updateInvoice(id, payload);
        toast.success("Retainer invoice updated.");
        navigate(`/sales/retainer-invoices/${id}`);
      } else {
        const created: any = await saveInvoice(payload);
        const createdId = String(created?.id || created?._id || "");
        toast.success("Retainer invoice saved.");
        navigate(createdId ? `/sales/retainer-invoices/${createdId}` : "/sales/retainer-invoices");
      }
    } catch (error: any) {
      console.error("Error saving retainer invoice:", error);
      toast.error(error?.message || "Failed to save retainer invoice.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900">{isEditMode ? "Edit Retainer Invoice" : "New Retainer Invoice"}</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Retainer Number</label>
          <input
            value={form.invoiceNumber}
            onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={form.invoiceDate}
            onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-slate-700 mb-1">Customer</label>
          <select
            value={form.customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Select customer</option>
            {customers.map((c: any) => (
              <option key={String(c?.id || c?._id)} value={String(c?.id || c?._id)}>
                {String(c?.displayName || c?.name || c?.companyName || "Customer")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Reference</label>
          <input
            value={form.referenceNumber}
            onChange={(e) => setForm((p) => ({ ...p, referenceNumber: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => handleSave("draft")}
          disabled={saving}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave("sent")}
          disabled={saving}
          className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-[#156372] to-[#0D4A52] hover:opacity-90 disabled:opacity-60"
        >
          Save and Send
        </button>
        <button
          onClick={() => navigate("/sales/retainer-invoices")}
          disabled={saving}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
