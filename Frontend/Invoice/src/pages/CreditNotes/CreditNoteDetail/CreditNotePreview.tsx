import React from "react";
import { CreditNote } from "../../salesModel";

interface CreditNotePreviewProps {
  creditNote: CreditNote;
  organizationProfile: any;
  baseCurrency: string;
  onCustomerClick?: (customerId: string) => void;
}

const CreditNotePreview: React.FC<CreditNotePreviewProps> = ({
  creditNote,
  organizationProfile,
  baseCurrency,
  onCustomerClick
}) => {
  void onCustomerClick;

  const toNumber = (value: any) => {
    const numeric = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const normalizeCurrency = (currency?: string) => {
    const code = String(currency || baseCurrency || "USD").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "USD";
  };

  const formatCurrency = (amount: any, currency?: string) => {
    const code = normalizeCurrency(currency);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(toNumber(amount));
    } catch (_error) {
      return `${code} ${toNumber(amount).toFixed(2)}`;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return String(date);
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const companyName = String(
    organizationProfile?.organizationName ||
      organizationProfile?.companyName ||
      creditNote.companyName ||
      "Taban Enterprise"
  ).trim();
  const customerValue = creditNote.customer;
  const customerName =
    String(
      creditNote.customerName ||
        (typeof customerValue === "object"
          ? customerValue?.displayName || customerValue?.name || customerValue?.companyName || customerValue?.fullName
          : customerValue) ||
        "-"
    ).trim();
  const customerEmail = String(
    creditNote.customerEmail ||
      (typeof customerValue === "object" ? customerValue?.email || customerValue?.contactEmail : "") ||
      ""
  ).trim();

  const items = Array.isArray(creditNote.items) ? creditNote.items : [];
  const subtotal =
    toNumber(creditNote.subtotal ?? creditNote.subTotal) ||
    items.reduce((sum: number, item: any) => {
      const quantity = toNumber(item?.quantity);
      const rate = toNumber(item?.unitPrice ?? item?.rate);
      const lineTotal = toNumber(item?.total ?? item?.amount);
      return sum + (lineTotal || quantity * rate);
    }, 0);
  const total = toNumber(creditNote.total ?? creditNote.amount ?? subtotal);
  const balance = toNumber(creditNote.balance ?? total);
  const discount = toNumber(creditNote.discount);
  const shipping = toNumber(creditNote.shipping);
  const taxTotal = toNumber(
    creditNote.tax ??
      creditNote.vat ??
      (Array.isArray(creditNote.taxes) ? creditNote.taxes.reduce((sum: number, tax: any) => sum + toNumber(tax?.amount), 0) : 0)
  );
  const usedCredits = Math.max(total - balance, 0);
  const creditNoteNumber = String(creditNote.creditNoteNumber || creditNote.id || "-");
  const status = String(creditNote.status || "").trim().toLowerCase();
  const statusMeta: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-amber-50 text-amber-700 border-amber-200" },
    open: { label: "Open", className: "bg-sky-50 text-sky-700 border-sky-200" },
    closed: { label: "Closed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    void: { label: "Void", className: "bg-rose-50 text-rose-700 border-rose-200" },
    applied: { label: "Applied", className: "bg-violet-50 text-violet-700 border-violet-200" }
  };
  const statusInfo = statusMeta[status] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    className: "bg-slate-100 text-slate-700 border-slate-200"
  };
  const generatedDate = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const notesText = String(creditNote.customerNotes || creditNote.reason || "").trim();
  const termsText = String(creditNote.termsAndConditions || "").trim();

  const companyLines = [
    organizationProfile?.addressLine1,
    organizationProfile?.addressLine2,
    [organizationProfile?.city, organizationProfile?.state, organizationProfile?.zipCode].filter(Boolean).join(" "),
    organizationProfile?.country
  ].filter((line) => String(line || "").trim());

  const metaRows = [
    { label: "Credit Date", value: formatDate(creditNote.creditNoteDate || creditNote.date) },
    { label: "Reference #", value: String(creditNote.referenceNumber || "-") },
    { label: "Location", value: String((creditNote as any)?.location || "-") },
    { label: "Salesperson", value: String((creditNote as any)?.salesperson?.name || creditNote.salesperson?.name || creditNote.salesperson || "-") },
    { label: "Currency", value: normalizeCurrency(creditNote.currency) },
    { label: "Status", value: statusInfo.label }
  ];

  return (
    <div
      data-credit-note-pdf-page
      className="relative mx-auto overflow-hidden bg-white text-slate-900"
      style={{
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box"
      }}
    >
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-[#0D4A52] via-[#156372] to-[#62A6B0]" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#156372]/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-slate-100 blur-3xl" />

      <div className="relative p-8 pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-[56%]">
            <div className="inline-flex items-center rounded-full border border-[#cfe5e8] bg-[#f1f8f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0D4A52]">
              Credit Note
            </div>

            <div className="mt-4 flex items-start gap-4">
              {organizationProfile?.logo ? (
                <img
                  src={organizationProfile.logo}
                  alt="Company logo"
                  className="h-16 w-16 rounded-2xl border border-slate-200 object-contain p-2 shadow-sm"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D4A52] to-[#156372] text-xl font-black text-white shadow-sm">
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="text-3xl font-black tracking-tight text-slate-900">{companyName}</div>
                <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                  {companyLines.map((line) => (
                    <div key={String(line)}>{line}</div>
                  ))}
                  {organizationProfile?.email && <div>{organizationProfile.email}</div>}
                  {organizationProfile?.phone && <div>{organizationProfile.phone}</div>}
                  {organizationProfile?.website && <div>{organizationProfile.website}</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[300px] rounded-[24px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Credit Note Summary
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">#{creditNoteNumber}</div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Credits Remaining
              </div>
              <div className="mt-2 text-2xl font-black text-[#0D4A52]">
                {formatCurrency(balance, creditNote.currency)}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                {statusInfo.label}
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Generated</div>
                <div className="text-xs font-medium text-slate-700">{generatedDate}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#156372]">
              Bill To
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">{customerName}</div>
            {customerEmail && <div className="mt-1 text-sm text-slate-600">{customerEmail}</div>}
            <div className="mt-4 text-sm leading-6 text-slate-600">
              {typeof customerValue === "object" && (
                <>
                  {customerValue?.addressLine1 && <div>{customerValue.addressLine1}</div>}
                  {customerValue?.addressLine2 && <div>{customerValue.addressLine2}</div>}
                  {(customerValue?.city || customerValue?.state || customerValue?.zipCode) && (
                    <div>{[customerValue?.city, customerValue?.state, customerValue?.zipCode].filter(Boolean).join(" ")}</div>
                  )}
                  {customerValue?.country && <div>{customerValue.country}</div>}
                </>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#156372]">
              Details
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
              {metaRows.map((row) => (
                <div key={row.label} className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {row.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="w-12 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">Item & Description</th>
                <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em]">Qty</th>
                <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em]">Rate</th>
                <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const quantity = toNumber(item?.quantity);
                const rate = toNumber(item?.unitPrice ?? item?.rate);
                const lineAmount = toNumber(item?.total ?? item?.amount ?? quantity * rate);

                return (
                  <tr key={String(item?.id || index)} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-4 text-center text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {item?.itemDetails || item?.itemName || item?.name || "-"}
                      </div>
                      {item?.description && (
                        <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {quantity.toFixed(2)}
                      {item?.unit && <span className="ml-1 text-xs text-slate-400">{item.unit}</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {formatCurrency(rate, creditNote.currency)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(lineAmount, creditNote.currency)}
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm italic text-slate-500">
                    No items in this credit note
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Notes
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {notesText || "No customer notes provided."}
            </div>

            {termsText && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Terms and Conditions
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {termsText}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#156372]">
              Amount Summary
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <span className="font-medium text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal, creditNote.currency)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="font-medium text-slate-600">Discount</span>
                  <span className="font-semibold text-slate-900">-{formatCurrency(discount, creditNote.currency)}</span>
                </div>
              )}

              {shipping > 0 && (
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="font-medium text-slate-600">Shipping</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(shipping, creditNote.currency)}</span>
                </div>
              )}

              {taxTotal > 0 && (
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="font-medium text-slate-600">Tax</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(taxTotal, creditNote.currency)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-100 py-2 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total, creditNote.currency)}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#0D4A52] px-4 py-3 text-white">
                <span className="text-sm font-semibold">Credits Remaining</span>
                <span className="text-base font-black">{formatCurrency(balance, creditNote.currency)}</span>
              </div>

              {usedCredits > 0 && (
                <div className="flex items-center justify-between py-1 text-sm text-rose-600">
                  <span className="font-medium">Credits Used</span>
                  <span className="font-semibold">{formatCurrency(usedCredits, creditNote.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <span>{companyName}</span>
          <span>Generated by Invoice System</span>
        </div>
      </div>
    </div>
  );
};

export default CreditNotePreview;
