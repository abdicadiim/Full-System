export const toNumber = (value: any) => {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDate = (dateString: any) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatCurrency = (amount: any, currency = "USD") => {
  const currencySymbol = currency ? String(currency).split(" - ")[0].split(" ")[0] : "USD";
  return `${currencySymbol}${parseFloat(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getInvoiceDateValue = (invoice: any) =>
  invoice?.invoiceDate || invoice?.date || invoice?.createdAt || "";

export const getInvoiceDueDateValue = (invoice: any) =>
  invoice?.dueDate || invoice?.expectedPaymentDate || "";

export const getInvoiceBalanceDueValue = (invoice: any) => {
  const total = toNumber(invoice?.total ?? invoice?.amount ?? 0);
  const balanceDue = toNumber(invoice?.balanceDue ?? invoice?.balance ?? 0);
  if (balanceDue > 0) return balanceDue;
  const paid = toNumber(invoice?.amountPaid ?? invoice?.paidAmount ?? 0);
  if (paid > 0) return Math.max(0, total - paid);
  return balanceDue;
};

export const getInvoiceStatusMeta = (invoice: any) => {
  const rawStatus = String(invoice?.status || "").toLowerCase();
  const dueRaw = getInvoiceDueDateValue(invoice);
  const dueDate = dueRaw ? new Date(dueRaw) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const balanceDue = getInvoiceBalanceDueValue(invoice);
  if (rawStatus === "draft") return { label: "DRAFT", className: "text-yellow-700" };
  if (balanceDue <= 0 && rawStatus) return { label: "PAID", className: "text-emerald-700" };
  if (dueDate && isSameDay(dueDate, today) && balanceDue > 0) return { label: "DUE TODAY", className: "text-[#2F80FF]" };
  if (dueDate && dueDate.getTime() < today.getTime() && balanceDue > 0) return { label: "OVERDUE", className: "text-red-600" };

  if (rawStatus === "sent" || rawStatus === "open" || rawStatus === "unpaid") return { label: "UNPAID", className: "text-[#2F80FF]" };
  if (rawStatus) return { label: rawStatus.toUpperCase(), className: "text-gray-700" };
  return { label: "UNPAID", className: "text-[#2F80FF]" };
};

export const getQuoteTotalsMeta = (quoteData: any) => {
  const items = Array.isArray(quoteData?.items) ? quoteData.items : [];
  const computedSubTotal = items.reduce((sum: number, item: any) => {
    const quantity = toNumber(item?.quantity ?? 0);
    const rate = toNumber(item?.unitPrice ?? item?.rate ?? item?.price ?? 0);
    const amount = toNumber(item?.amount ?? item?.total);
    const lineTotal = amount || (quantity * rate);
    return sum + lineTotal;
  }, 0);
  const subTotal = toNumber(quoteData?.subTotal ?? quoteData?.subtotal ?? computedSubTotal);

  const shippingCharges = toNumber(
    quoteData?.shippingCharges ??
    quoteData?.shipping ??
    quoteData?.shippingCharge ??
    0
  );
  const shippingTaxAmount = toNumber(quoteData?.shippingTaxAmount ?? quoteData?.shippingTax ?? 0);
  const taxAmountFromQuote = toNumber(quoteData?.totalTax ?? quoteData?.taxAmount ?? quoteData?.tax ?? 0);
  const itemsTaxAmount = items.reduce((sum: number, item: any) => sum + toNumber(item?.taxAmount ?? 0), 0);
  const taxAmount = taxAmountFromQuote || (itemsTaxAmount + shippingTaxAmount);
  const discount = toNumber(quoteData?.discount ?? quoteData?.discountAmount ?? 0);
  const adjustment = toNumber(quoteData?.adjustment ?? 0);
  const roundOff = toNumber(quoteData?.roundOff ?? 0);
  const taxExclusive = quoteData?.taxExclusive || "Tax Exclusive";
  const isTaxInclusive = taxExclusive === "Tax Inclusive";

  const discountBase = Math.max(0, isTaxInclusive ? (subTotal - taxAmount) : subTotal);
  const discountRate = discount > 0 && discountBase > 0 ? (discount / discountBase) * 100 : 0;
  const discountLabel = discount > 0 ? `Discount(${discountRate.toFixed(2)}%)` : "Discount";

  const explicitTaxName = String(quoteData?.taxName || "").trim();
  let taxLabel = explicitTaxName;
  if (!taxLabel) {
    const rates = Array.from(new Set((quoteData?.items || [])
      .map((item: any) => toNumber(item?.taxRate))
      .filter((rate: number) => rate > 0))) as number[];
    if (rates.length === 1) {
      const rateValue = rates[0];
      const rateText = Number.isInteger(rateValue) ? rateValue.toFixed(0) : rateValue.toFixed(2);
      taxLabel = `Tax (${rateText}%)`;
    } else {
      taxLabel = isTaxInclusive ? "Tax (Included)" : "Tax";
    }
  }

  const shippingTaxSource =
    quoteData?.shippingChargeTax ??
    quoteData?.shippingTaxId ??
    quoteData?.shippingTax;
  const shippingTaxName =
    shippingTaxSource && typeof shippingTaxSource === "object"
      ? String((shippingTaxSource as any).name || (shippingTaxSource as any).taxName || "")
      : String(quoteData?.shippingTaxName || "");
  const shippingTaxRate =
    shippingTaxSource && typeof shippingTaxSource === "object"
      ? parseFloat((shippingTaxSource as any).rate || 0) || 0
      : parseFloat(quoteData?.shippingTaxRate || 0) || 0;
  const shippingTaxLabel =
    shippingTaxName ||
    (shippingTaxRate > 0 ? `Shipping Tax (${Number.isInteger(shippingTaxRate) ? shippingTaxRate.toFixed(0) : shippingTaxRate.toFixed(2)}%)` : "Shipping Tax");

  const computedTotal = isTaxInclusive
    ? (subTotal - discount + shippingCharges + adjustment + roundOff)
    : (subTotal + taxAmount - discount + shippingCharges + adjustment + roundOff);

  return {
    subTotal,
    taxAmount,
    discount,
    shippingCharges,
    shippingTaxAmount,
    shippingTaxLabel,
    adjustment,
    roundOff,
    taxExclusive,
    discountBase,
    discountLabel,
    taxLabel,
    total: toNumber(quoteData?.total ?? computedTotal)
  };
};

export const getStatusBadge = (status: any) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "text-yellow-800" },
    approved: { label: "Approved", className: "text-emerald-700" },
    sent: { label: "Sent", className: "text-blue-800" },
    open: { label: "Open", className: "text-[#0D4A52]" },
    accepted: { label: "Accepted", className: "text-[#0D4A52]" },
    declined: { label: "Declined", className: "text-red-800" },
    rejected: { label: "Declined", className: "text-red-800" },
    expired: { label: "Expired", className: "text-gray-800" },
    converted: { label: "Invoiced", className: "text-[#0D4A52]" },
    invoiced: { label: "Invoiced", className: "text-[#0D4A52]" },
  };
  const statusInfo = statusMap[String(status || "").toLowerCase()] || statusMap.draft;
  return <span className={`text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>;
};

export const getInitial = (name: any) => {
  return name ? String(name).charAt(0).toUpperCase() : "?";
};

export const isImageFileAttachment = (attachment: any) => {
  const mimeType = String(attachment?.type || attachment?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) return true;
  const name = String(attachment?.name || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) => name.endsWith(ext));
};

export const normalizeAttachmentFromQuote = (attachment: any, index: number) => {
  const attachmentId = attachment?.documentId || attachment?._id || attachment?.id || `attachment-${Date.now()}-${index}`;
  const fileUrl = attachment?.url || attachment?.preview || "";
  const mimeType = attachment?.type || attachment?.mimeType || "";
  return {
    id: attachmentId,
    documentId: attachment?.documentId || attachment?._id || attachment?.id,
    name: attachment?.name || "Attachment",
    size: Number(attachment?.size || 0),
    type: mimeType,
    mimeType,
    url: fileUrl,
    preview: isImageFileAttachment({ ...attachment, type: mimeType }) ? fileUrl : null,
    uploadedAt: attachment?.uploadedAt || attachment?.createdAt || new Date().toISOString()
  };
};

export const normalizeCommentFromQuote = (comment: any, index: number) => ({
  id: comment?._id || comment?.id || `comment-${Date.now()}-${index}`,
  text: String(comment?.text || ""),
  author: comment?.author || "User",
  timestamp: comment?.timestamp || comment?.createdAt || new Date().toISOString(),
  bold: Boolean(comment?.bold),
  italic: Boolean(comment?.italic),
  underline: Boolean(comment?.underline)
});

export const normalizeActivityLogFromQuote = (entry: any, index: number) => ({
  id: entry?._id || entry?.id || `activity-${Date.now()}-${index}`,
  action: String(entry?.action || "Updated quote"),
  description: String(entry?.description || ""),
  actor: String(entry?.actor || "User"),
  timestamp: entry?.timestamp || entry?.createdAt || new Date().toISOString(),
  level: String(entry?.level || "info")
});

export const getCurrentUserDisplayName = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser?.name || parsedUser?.fullName || parsedUser?.username || parsedUser?.email || "You";
    }
  } catch (error) {
    console.error("Error reading user profile for comment author:", error);
  }
  return "You";
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const generateQuoteHTMLForQuote = (quoteData: any, organizationProfile: any, ownerEmail: any) => {
  if (!quoteData) return "";

  const itemsHTML = quoteData.items && quoteData.items.length > 0 ? quoteData.items.map((item: any, index: number) => {
    const rate = parseFloat(item.unitPrice || item.rate || item.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amount = parseFloat(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price || 0))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const qty = parseFloat(item.quantity || 0).toFixed(2);
    const unit = item.item?.unit || item.unit || "pcs";
    const itemName = item.name || item.item?.name || "N/A";
    const rowBg = index % 2 === 0 ? "#ffffff" : "#fafafa";
    return `
      <tr style="background:${rowBg};">
        <td>${index + 1}</td>
        <td>
          <div><strong style="font-weight: 500;">${itemName}</strong></div>
          ${item.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.description}</div>` : ""}
        </td>
        <td>
          <div>${qty}</div>
          <div class="qty-unit">${unit}</div>
        </td>
        <td>${rate}</td>
        <td>${amount}</td>
      </tr>
    `;
  }).join("") : '<tr><td colspan="5" style="padding: 24px; text-align: center; color: #666; font-size: 14px;">No items added</td></tr>';

  const quoteDate = quoteData.quoteDate || quoteData.date || new Date().toISOString();
  const customerName = quoteData.customerName || (typeof quoteData.customer === "object" ? (quoteData.customer?.displayName || quoteData.customer?.name) : quoteData.customer) || "N/A";
  const notes = quoteData.customerNotes || "Looking forward for your business.";
  const totalsMeta = getQuoteTotalsMeta(quoteData);

  const organizationName = String(organizationProfile?.organizationName || organizationProfile?.name || "Organization").trim() || "Organization";
  const organizationNameHtml = escapeHtml(organizationName);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quote ${quoteData.quoteNumber || quoteData.id}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 20mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 42px 36px 22px 36px;
          color: #111827;
          line-height: 1.35;
          background: #fff;
        }
        .quote-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 14px; }
        .company-name { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
        .company-address { font-size: 11px; color: #4b5563; line-height: 1.45; }
        .quote-title h1 { font-size: 40px; font-weight: 500; color: #111827; letter-spacing: 1.2px; line-height: 1; }
        .quote-number { font-size: 16px; color: #111827; font-weight: 700; margin-top: 6px; text-align: right; }
        .bill-date { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .bill-to-label { font-size: 15px; color: #111827; margin-bottom: 4px; font-weight: 600; }
        .bill-to-name { font-size: 15px; color: #2563eb; font-weight: 600; line-height: 1.2; }
        .bill-date-right { display: flex; align-items: center; gap: 22px; }
        .bill-date-colon { font-size: 16px; color: #6b7280; line-height: 1; }
        .quote-date { font-size: 13px; color: #111827; min-width: 120px; text-align: right; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .items-table th { padding: 9px 12px; text-align: left; color: white; font-size: 11px; font-weight: 600; background-color: #3f3f46; }
        .items-table th:first-child { width: 44px; text-align: center; }
        .items-table th:nth-child(3), .items-table th:nth-child(4), .items-table th:nth-child(5) { width: 100px; text-align: right; }
        .items-table td { border-bottom: 1px solid #d1d5db; padding: 9px 12px; font-size: 11px; vertical-align: top; }
        .items-table td:first-child { text-align: center; }
        .items-table td:nth-child(3), .items-table td:nth-child(4), .items-table td:nth-child(5) { text-align: right; }
        .qty-unit { font-size: 10px; color: #6b7280; margin-top: 2px; }
        .totals { width: 320px; margin-left: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fcfcfd; padding: 10px 12px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; color: #4b5563; }
        .total-row.subtotal { font-size: 15px; color: #111827; font-weight: 600; }
        .total-subrow { font-size: 10px; color: #6b7280; margin-top: -2px; margin-bottom: 6px; }
        .total-row.final { padding: 10px 12px; font-size: 17px; font-weight: 700; background: #f3f4f6; border-radius: 6px; margin-top: 8px; color: #111827; }
        .total-value { color: #111827; font-weight: 500; }
        .notes { margin-top: 18px; margin-bottom: 12px; border-top: 1px dashed #d1d5db; padding-top: 10px; }
        .notes-label { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; letter-spacing: 0.2px; }
        .notes-content { font-size: 11px; color: #4b5563; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="quote-header">
        <div class="quote-title">
          <div class="company-name">${organizationNameHtml}</div>
          <div class="company-address">
            ${organizationProfile?.address?.street1 || ""}<br/>
            ${organizationProfile?.address?.street2 || ""}<br/>
            ${organizationProfile?.address?.city ? `${organizationProfile.address.city}${organizationProfile.address.zipCode ? ` ${organizationProfile.address.zipCode}` : ""}${organizationProfile.address.state ? `, ${organizationProfile.address.state}` : ""}` : ""}<br/>
            ${organizationProfile?.address?.country || ""}<br/>
            ${ownerEmail?.email || organizationProfile?.email || ""}
          </div>
        </div>
        <div class="quote-title">
          <h1>QUOTE</h1>
          <div class="quote-number"># ${quoteData.quoteNumber || quoteData.id}</div>
        </div>
      </div>

      <div class="bill-date">
        <div>
          <div class="bill-to-label">Bill To</div>
          <div class="bill-to-name">${customerName}</div>
        </div>
        <div class="bill-date-right">
          <div class="bill-date-colon">:</div>
          <div class="quote-date">${new Date(quoteDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item & Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row subtotal">
          <span class="total-label">Sub Total</span>
          <span class="total-value">${Number(totalsMeta.subTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="total-subrow">(${totalsMeta.taxExclusive})</div>
        ${totalsMeta.discount > 0 ? `
        <div class="total-row">
          <span class="total-label">${totalsMeta.discountLabel}</span>
          <span class="total-value">(-) ${formatCurrency(totalsMeta.discount || 0, quoteData.currency)}</span>
        </div>
        <div class="total-subrow">
          (Applied on ${formatCurrency(totalsMeta.discountBase, quoteData.currency)})
        </div>
        ` : ""}
        ${totalsMeta.taxAmount > 0 ? `
        <div class="total-row">
          <span class="total-label">${totalsMeta.taxLabel}</span>
          <span class="total-value">${formatCurrency(totalsMeta.taxAmount || 0, quoteData.currency)}</span>
        </div>
        ` : ""}
        ${totalsMeta.shippingCharges !== 0 ? `
        <div class="total-row">
          <span class="total-label">Shipping charge</span>
          <span class="total-value">${formatCurrency(totalsMeta.shippingCharges, quoteData.currency)}</span>
        </div>
        ` : ""}
        ${totalsMeta.shippingTaxAmount > 0 ? `
        <div class="total-row">
          <span class="total-label">${totalsMeta.shippingTaxLabel}</span>
          <span class="total-value">${formatCurrency(totalsMeta.shippingTaxAmount, quoteData.currency)}</span>
        </div>
        ` : ""}
        ${totalsMeta.adjustment !== 0 ? `
        <div class="total-row">
          <span class="total-label">Adjustment</span>
          <span class="total-value">${formatCurrency(totalsMeta.adjustment, quoteData.currency)}</span>
        </div>
        ` : ""}
        ${totalsMeta.roundOff !== 0 ? `
        <div class="total-row">
          <span class="total-label">Round Off</span>
          <span class="total-value">${formatCurrency(totalsMeta.roundOff, quoteData.currency)}</span>
        </div>
        ` : ""}
        <div class="total-row final">
          <span>Total</span>
          <span>${formatCurrency(totalsMeta.total, quoteData.currency)}</span>
        </div>
      </div>

      <div class="notes">
        <div class="notes-label">Notes</div>
        <div class="notes-content">${notes}</div>
      </div>
    </body>
    </html>
  `;
};

