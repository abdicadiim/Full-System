type InvoiceLike = {
  status?: string;
  dueDate?: string;
  balanceDue?: number;
};

const normalizeStatus = (status: string) => String(status || "").trim().toLowerCase();

export const getInvoiceStatusDisplay = (invoice: InvoiceLike) => {
  const status = normalizeStatus(invoice?.status || "");

  if (status === "paid") {
    return { text: "Paid", color: "bg-green-100 text-green-700" };
  }
  if (status === "overdue") {
    return { text: "Overdue", color: "bg-red-100 text-red-700" };
  }
  if (status === "sent") {
    return { text: "Sent", color: "bg-blue-100 text-blue-700" };
  }
  if (status === "draft") {
    return { text: "Draft", color: "bg-gray-100 text-gray-700" };
  }
  if (status === "void") {
    return { text: "Void", color: "bg-zinc-200 text-zinc-700" };
  }

  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const isOverdueByDate =
    dueDate instanceof Date &&
    !Number.isNaN(dueDate.getTime()) &&
    dueDate.getTime() < Date.now() &&
    Number(invoice?.balanceDue || 0) > 0;

  if (isOverdueByDate) {
    return { text: "Overdue", color: "bg-red-100 text-red-700" };
  }

  const fallback = String(invoice?.status || "Draft").trim();
  return {
    text: fallback || "Draft",
    color: "bg-gray-100 text-gray-700",
  };
};
