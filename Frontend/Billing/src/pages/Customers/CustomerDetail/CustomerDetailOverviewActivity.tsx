import React from "react";

type CustomerDetailOverviewActivityProps = {
  customer: any;
  id?: string;
  invoices: any[];
  payments: any[];
  creditNotes: any[];
  quotes: any[];
  salesReceipts: any[];
  recurringInvoices: any[];
  customerSubscriptions: any[];
  formatCurrency: (amount: any, currency?: string) => string;
};

export default function CustomerDetailOverviewActivity({
  customer,
  id,
  invoices,
  payments,
  creditNotes,
  quotes,
  salesReceipts,
  recurringInvoices,
  customerSubscriptions,
  formatCurrency,
}: CustomerDetailOverviewActivityProps) {
  const events: Array<{
    id: string;
    date: Date;
    title: string;
    description: string;
    author?: string;
    color: string;
    detailsLink?: string;
  }> = [];

  const canonicalCustomerId = String((customer as any)?._id || (customer as any)?.id || id || "").trim();
  const customerUpdatedAt = (customer as any)?.updatedAt || (customer as any)?.modifiedAt || (customer as any)?.updated_on;

  const toValidDate = (value: any): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const pickDate = (...candidates: any[]) => {
    for (const candidate of candidates) {
      const date = toValidDate(candidate);
      if (date) return date;
    }
    return null;
  };

  const resolvePersonName = (value: any) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();

    return String(
      value.displayName ||
        value.name ||
        value.fullName ||
        value.username ||
        value.email ||
        value.createdByName ||
        value.updatedByName ||
        value.created_by_name ||
        value.updated_by_name ||
        value.createdBy ||
        value.updatedBy ||
        value.created_by ||
        value.updated_by ||
        ""
    ).trim();
  };

  const resolveActorName = (...candidates: any[]) => {
    for (const candidate of candidates) {
      const resolved = resolvePersonName(candidate);
      if (resolved) return resolved;
    }
    return "Unknown";
  };

  const matchesCustomer = (row: any) => {
    if (!row || !canonicalCustomerId) return false;
    const rowCustomerId = String(
      row.customerId || row.customer?._id || row.customer?.id || row.customer || row.customer_id || "",
    ).trim();
    return rowCustomerId ? rowCustomerId === canonicalCustomerId : false;
  };

  const getActor = (row: any) =>
    resolveActorName(
      row?.updatedBy,
      row?.modifiedBy,
      row?.updated_by,
      row?.modified_by,
      row?.updatedByUser,
      row?.modifiedByUser,
      row?.updatedByName,
      row?.updated_by_name,
      row?.createdBy,
      row?.created_by,
      row?.createdByUser,
      row?.created_by_user,
      row?.createdByName,
      row?.created_by_name,
      customer?.updatedBy,
      customer?.modifiedBy,
      customer?.updated_by,
      customer?.createdBy,
      customer?.created_by,
      customer?.updatedByUser,
      customer?.createdByUser,
      customer?.updatedByName,
      customer?.createdByName
    );

  if (customer?.createdDate || customer?.createdAt) {
    events.push({
      id: `customer-created-${customer.id || id}`,
      date: new Date(String(customer.createdDate || customer.createdAt)),
      title: "Contact added",
      description: "Customer created",
      author: resolveActorName(
        customer?.createdBy,
        customer?.created_by,
        customer?.createdByUser,
        customer?.created_by_user,
        customer?.createdByName,
        customer?.created_by_name
      ),
      color: "border-blue-400",
    });
  }

  const createdTime = pickDate((customer as any)?.createdDate, (customer as any)?.createdAt);
  const updatedTime = pickDate(customerUpdatedAt);
  if (updatedTime && (!createdTime || updatedTime.getTime() !== createdTime.getTime())) {
    events.push({
      id: `customer-updated-${customer.id || id}`,
      date: updatedTime,
      title: "Contact updated",
      description: "Customer updated",
      author: getActor(customer),
      color: "border-blue-400",
    });
  }

  (customer?.contactPersons || []).forEach((contact: any, index: number) => {
    const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact person";
    const date =
      pickDate(contact.updatedAt, contact.createdAt, (customer as any)?.updatedAt, (customer as any)?.createdDate, Date.now()) ||
      new Date();
    events.push({
      id: `contact-person-${contact.id || index}`,
      date,
      title: contact.updatedAt ? "Contact person updated" : "Contact person added",
      description: `Contact person ${contactName} has been ${contact.updatedAt ? "updated" : "created"}`,
      author: getActor(contact),
      color: "border-blue-400",
    });
  });

  invoices.forEach((invoice: any, index: number) => {
    if (!matchesCustomer(invoice)) return;
    const date = pickDate(invoice.updatedAt, invoice.invoiceDate, invoice.date, invoice.createdAt, invoice.created_on, Date.now()) || new Date();
    const invoiceNumber = String(
      invoice.invoiceNumber || invoice.invoiceNo || invoice.invoice_number || invoice.number || invoice.id || invoice._id || "record",
    );
    const normalizedStatus = String(invoice.status || invoice.invoiceStatus || "").toLowerCase();
    const actionLabel = invoice.updatedAt ? "updated" : "created";

    events.push({
      id: `invoice-${invoice.id || invoice._id || index}`,
      date,
      title: invoice.updatedAt ? "Invoice updated" : "Invoice added",
      description: `Invoice ${invoiceNumber} ${normalizedStatus || actionLabel}`,
      author: getActor(invoice),
      color: "border-sky-400",
      detailsLink: "View Details",
    });
  });

  payments.forEach((payment: any, index: number) => {
    if (!matchesCustomer(payment)) return;
    const date = pickDate(payment.updatedAt, payment.paymentDate, payment.date, payment.createdAt, payment.created_on, Date.now()) || new Date();
    const paymentAmount = Number(payment.amountReceived || payment.amount || payment.total || 0) || 0;
    const paymentCurrency = String(payment.currency || customer?.currency || "USD");
    const invoiceRef = String(payment.invoiceNumber || payment.invoiceNo || payment.invoiceId || payment.invoice_id || "invoice");
    events.push({
      id: `payment-${payment.id || payment._id || index}`,
      date,
      title: payment.updatedAt ? "Payments Received updated" : "Payment received",
      description: payment.updatedAt ? "Invoice payment details modified" : `${formatCurrency(paymentAmount, paymentCurrency)} applied for ${invoiceRef}`,
      author: getActor(payment),
      color: "border-green-400",
    });
  });

  creditNotes.forEach((creditNote: any, index: number) => {
    if (!matchesCustomer(creditNote)) return;
    const date = pickDate(creditNote.updatedAt, creditNote.creditNoteDate, creditNote.date, creditNote.createdAt, creditNote.created_on, Date.now()) || new Date();
    const number = String(creditNote.creditNoteNumber || creditNote.creditNoteNo || creditNote.number || creditNote.id || creditNote._id || "record");
    events.push({
      id: `credit-note-${creditNote.id || creditNote._id || index}`,
      date,
      title: creditNote.updatedAt ? "Credit Note updated" : "Credit Note added",
      description: `Credit Note ${number} ${creditNote.updatedAt ? "updated" : "created"}`,
      author: getActor(creditNote),
      color: "border-indigo-400",
      detailsLink: "View Details",
    });
  });

  quotes.filter(matchesCustomer).forEach((quote: any, index: number) => {
    const date = pickDate(quote.updatedAt, quote.date, quote.quoteDate, quote.createdAt, quote.created_on, Date.now()) || new Date();
    const number = String(quote.quoteNumber || quote.quoteNo || quote.number || quote.id || quote._id || "record");
    events.push({
      id: `quote-${quote.id || quote._id || index}`,
      date,
      title: quote.updatedAt ? "Quote updated" : "Quote added",
      description: `Quote ${number} ${quote.updatedAt ? "updated" : "created"}`,
      author: getActor(quote),
      color: "border-violet-400",
      detailsLink: "View Details",
    });
  });

  salesReceipts.filter(matchesCustomer).forEach((salesReceipt: any, index: number) => {
    const date = pickDate(
      salesReceipt.updatedAt,
      salesReceipt.date,
      salesReceipt.salesReceiptDate,
      salesReceipt.createdAt,
      salesReceipt.created_on,
      Date.now(),
    ) || new Date();
    const number = String(salesReceipt.salesReceiptNumber || salesReceipt.number || salesReceipt.id || salesReceipt._id || "record");
    events.push({
      id: `sales-receipt-${salesReceipt.id || salesReceipt._id || index}`,
      date,
      title: salesReceipt.updatedAt ? "Sales Receipt updated" : "Sales Receipt added",
      description: `Sales Receipt ${number} ${salesReceipt.updatedAt ? "updated" : "created"}`,
      author: getActor(salesReceipt),
      color: "border-emerald-400",
      detailsLink: "View Details",
    });
  });

  recurringInvoices.forEach((recurringInvoice: any, index: number) => {
    if (!matchesCustomer(recurringInvoice)) return;
    const date = pickDate(
      recurringInvoice.updatedAt,
      recurringInvoice.startDate,
      recurringInvoice.recurringInvoiceDate,
      recurringInvoice.createdAt,
      recurringInvoice.created_on,
      Date.now(),
    ) || new Date();
    const number = String(
      recurringInvoice.profileName || recurringInvoice.recurringInvoiceNumber || recurringInvoice.number || recurringInvoice.id || recurringInvoice._id || "record",
    );
    events.push({
      id: `recurring-invoice-${recurringInvoice.id || recurringInvoice._id || index}`,
      date,
      title: recurringInvoice.updatedAt ? "Recurring Invoice updated" : "Recurring Invoice added",
      description: `Recurring invoice ${number} ${recurringInvoice.updatedAt ? "updated" : "created"}`,
      author: getActor(recurringInvoice),
      color: "border-teal-400",
    });
  });

  customerSubscriptions.forEach((subscription: any, index: number) => {
    const subCustomerId = String(subscription?.customerId || subscription?.customer_id || "").trim();
    if (canonicalCustomerId && subCustomerId && subCustomerId !== canonicalCustomerId) return;

    const date = pickDate(subscription.updatedAt, subscription.createdOn, subscription.activatedOn, subscription.createdAt, Date.now()) || new Date();
    const number = String(subscription.subscriptionNumber || subscription.subscriptionNo || subscription.number || subscription.id || subscription._id || "record");
    const plan = String(
      subscription.planName ||
        subscription.plan_name ||
        subscription.plan?.name ||
        subscription.plan?.planName ||
        subscription.productName ||
        subscription.product?.name ||
        subscription.items?.[0]?.itemDetails ||
        subscription.items?.[0]?.name ||
        subscription.addonLines?.[0]?.addonName ||
        subscription.addonLines?.[0]?.name ||
        subscription.name ||
        "",
    ).trim();

    events.push({
      id: `subscription-${subscription.id || subscription._id || index}`,
      date,
      title: subscription.updatedAt ? "Subscription updated" : "Subscription added",
      description: `${number}${plan ? ` - ${plan}` : ""} ${subscription.updatedAt ? "updated" : "created"}`,
      author: getActor(subscription),
      color: "border-cyan-400",
      detailsLink: "View Details",
    });
  });

  const displayEvents = events
    .filter((event) => !Number.isNaN(event.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 30);

  return (
    <div className="mb-6 border-t border-gray-200 pt-6">
      <div className="px-2">
        {displayEvents.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No activity found</div>
        ) : (
          <div className="space-y-8">
            {displayEvents.map((event, index) => {
              const formattedDate = event.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              const formattedTime = event.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
              const isLast = index === displayEvents.length - 1;

              return (
                <div key={event.id} className="grid grid-cols-[120px_24px_1fr] gap-4">
                  <div className="text-right">
                    <div className="text-[13px] text-gray-700">{formattedDate}</div>
                    <div className="text-[13px] text-blue-600">{formattedTime}</div>
                  </div>
                  <div className="relative flex justify-center">
                    {!isLast && <div className="absolute top-5 bottom-[-32px] w-px bg-blue-300"></div>}
                    <span className={`z-10 mt-1 h-4 w-4 rounded-full border-2 bg-white ${event.color}`}></span>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-5 py-4">
                    <p className="text-base font-medium text-gray-900">{event.title}</p>
                    <p className="mt-1 text-[15px] text-gray-600">{event.description}</p>
                    {event.author && (
                      <p className="mt-1 text-[15px] font-semibold text-[#4b5f82]">
                        by {event.author}
                        {event.detailsLink && <span className="ml-1 text-xs font-normal text-blue-600">{event.detailsLink}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
