import React from "react";
import { CreditNote } from "../../salesModel";
import { getCachedCreditNoteSettings } from "../../../services/api";

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
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = (currency || baseCurrency || "USD");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const items = Array.isArray(creditNote.items)
    ? creditNote.items
    : Array.isArray((creditNote as any).lineItems)
      ? (creditNote as any).lineItems
      : Array.isArray((creditNote as any).invoiceItems)
        ? (creditNote as any).invoiceItems
        : [];
  const derivedSubtotal = items.reduce((sum: number, item: any) => {
    const explicitAmount = toNumber(item?.total ?? item?.amount);
    if (explicitAmount) return sum + explicitAmount;
    const qty = toNumber(item?.quantity);
    const rate = toNumber(item?.unitPrice ?? item?.rate);
    return sum + qty * rate;
  }, 0);
  const subtotal = toNumber(creditNote.subtotal ?? creditNote.subTotal ?? derivedSubtotal);
  const shipping = toNumber((creditNote as any).shippingCharges ?? (creditNote as any).shipping);
  const shippingTaxRate = toNumber((creditNote as any).shippingTaxRate);
  const shippingTaxAmount = toNumber(
    (creditNote as any).shippingTaxAmount ??
    (creditNote as any).shippingTax ??
    (shippingTaxRate > 0 ? (shipping * shippingTaxRate) / 100 : 0)
  );
  const shippingTaxName = String((creditNote as any).shippingTaxName || (creditNote as any).shippingChargeTax || "");
  const adjustment = toNumber((creditNote as any).adjustment);
  const discount = toNumber((creditNote as any).discount);
  const vat = toNumber((creditNote as any).tax ?? (creditNote as any).vat ?? 0);
  const total = toNumber(
    creditNote.total ??
    creditNote.amount ??
    (subtotal - discount + shipping + shippingTaxAmount + vat + adjustment)
  );
  const balance = toNumber(creditNote.balance ?? total);
  const creditNoteSettings = getCachedCreditNoteSettings();
  const qrCodeEnabled = Boolean(creditNoteSettings?.qrCodeEnabled);
  const qrPayload = String(
    (creditNoteSettings as any)?.qrCodeValue ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/credit-notes/${creditNote.id || creditNote.creditNoteNumber || ""}`
        : `credit-note:${creditNote.creditNoteNumber || creditNote.id || ""}`)
  ).trim();
  const qrCodeUrl = qrCodeEnabled && qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`
    : "";

  return (
    <div
      className="w-full max-w-full mx-auto bg-white border border-[#d1d5db] shadow-sm overflow-hidden relative rounded-none"
      style={{ width: "210mm", minHeight: "297mm" }}
    >
      {(creditNote.status === "open" || creditNote.status === "draft") && (
        <div className="absolute top-8 -left-12 w-48 text-center py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold uppercase tracking-wider transform -rotate-45 shadow-lg z-10">
          {creditNote.status}
        </div>
      )}

      <div className="p-8 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1 mt-4 ml-8">
            {organizationProfile?.logo ? (
              <img
                src={organizationProfile.logo}
                alt="Company Logo"
                className="h-16 w-auto mb-3"
              />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {organizationProfile?.organizationName || "Taban Enterprise"}
              </div>
            )}
            <div className="text-sm text-gray-600 space-y-0.5">
              {organizationProfile?.addressLine1 && <div>{organizationProfile.addressLine1}</div>}
              {organizationProfile?.addressLine2 && <div>{organizationProfile.addressLine2}</div>}
              {(organizationProfile?.city || organizationProfile?.state || organizationProfile?.zipCode) && (
                <div>
                  {[organizationProfile?.city, organizationProfile?.state, organizationProfile?.zipCode]
                    .filter(Boolean)
                    .join(" ")}
                </div>
              )}
              {organizationProfile?.country && <div>{organizationProfile.country}</div>}
              {organizationProfile?.email && <div>{organizationProfile.email}</div>}
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CREDIT NOTE</h1>
            <div className="text-sm text-gray-600 mb-4">
              # {creditNote.creditNoteNumber || creditNote.id}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Credits Remaining
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(balance, creditNote.currency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 border-b border-gray-200">
        <div className="flex justify-between">
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
              Bill To
            </div>
            <div className="text-base font-semibold text-gray-900 mb-1">
              {creditNote.customerName ||
                (typeof creditNote.customer === "object"
                  ? (creditNote.customer?.displayName || creditNote.customer?.name)
                  : creditNote.customer) || "-"}
            </div>
          </div>

          <div className="text-right space-y-2">
            <div className="flex justify-end gap-12">
              <span className="text-sm text-gray-600 min-w-[100px] text-right">Credit Date :</span>
              <span className="text-sm font-medium text-gray-900 min-w-[100px] text-right">
                {formatDate(creditNote.creditNoteDate || creditNote.date)}
              </span>
            </div>
            {creditNote.referenceNumber && (
              <div className="flex justify-end gap-12">
                <span className="text-sm text-gray-600 min-w-[100px] text-right">Ref# :</span>
                <span className="text-sm font-medium text-gray-900 min-w-[100px] text-right">
                  {creditNote.referenceNumber}
                </span>
              </div>
            )}
            {(creditNote as any).taxExclusive && (
              <div className="flex justify-end gap-12">
                <span className="text-sm text-gray-600 min-w-[100px] text-right">Tax Mode :</span>
                <span className="text-sm font-medium text-gray-900 min-w-[100px] text-right">
                  {(creditNote as any).taxExclusive}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-center py-3 px-4 text-xs font-semibold w-12 uppercase tracking-wider">#</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Item & Description</th>
              <th className="text-right py-3 px-4 text-xs font-semibold w-24 uppercase tracking-wider">Qty</th>
              <th className="text-right py-3 px-4 text-xs font-semibold w-32 uppercase tracking-wider">Rate</th>
              <th className="text-right py-3 px-4 text-xs font-semibold w-32 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-500 text-center">{index + 1}</td>
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.itemDetails || item.itemName || item.name || "-"}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 mt-1 pre-wrap">{item.description}</div>
                  )}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-900">
                  {toNumber(item.quantity).toFixed(2)}
                  {item.unit && <span className="text-gray-400 text-xs ml-1">{item.unit}</span>}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-900">
                  {formatCurrency(toNumber(item.unitPrice ?? item.rate), creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
                </td>
                <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(
                    toNumber(item.total ?? item.amount ?? (toNumber(item.quantity) * toNumber(item.unitPrice ?? item.rate))),
                    creditNote.currency
                  ).replace(/[A-Z]{3}\s?/, "")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-500 italic">
                  No items in this credit note
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-8 pb-8">
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between py-2 text-sm border-b border-gray-100">
              <span className="text-gray-600 font-medium">Sub Total</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(subtotal, creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                <span className="text-gray-600 font-medium">Discount</span>
                <span className="font-medium text-gray-900">
                  -{formatCurrency(discount, creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
                </span>
              </div>
            )}

            {shipping > 0 && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                <span className="text-gray-600 font-medium">Shipping</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(shipping, creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
                </span>
              </div>
            )}

            {(shippingTaxAmount || shippingTaxName) && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                <span className="text-gray-600 font-medium">
                  Shipping Tax{shippingTaxName ? ` (${shippingTaxName})` : ""}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(shippingTaxAmount, creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
                </span>
              </div>
            )}

            {(vat || (creditNote.taxes && creditNote.taxes.length > 0)) && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                <span className="text-gray-600 font-medium">VAT</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(
                    vat || (Array.isArray(creditNote.taxes) ? creditNote.taxes.reduce((s: any, t: any) => s + toNumber(t.amount), 0) : 0),
                    creditNote.currency
                  ).replace(/[A-Z]{3}\s?/, "")}
                </span>
              </div>
            )}

            {adjustment !== 0 && (
              <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                <span className="text-gray-600 font-medium">Adjustment</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(adjustment, creditNote.currency).replace(/[A-Z]{3}\s?/, "")}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 text-sm font-bold text-gray-900 border-b border-gray-100">
              <span>Total</span>
              <span>
                {formatCurrency(total, creditNote.currency)}
              </span>
            </div>

            {(total - balance) > 0 && (
              <div className="flex justify-between py-2 text-sm text-red-500">
                <span>Credits Used</span>
                <span className="font-medium">
                  (-) {(total - balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 bg-gray-100 px-4 text-sm font-bold text-gray-900 mt-2 rounded">
              <span>Credits Remaining</span>
              <span>
                {formatCurrency(balance, creditNote.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 mt-4 text-right">
        <div className="text-xs text-gray-500">
          PDF Template : <span className="text-blue-500 cursor-pointer hover:underline">'Standard Template'</span> <span className="text-blue-500 cursor-pointer hover:underline mx-1">Change</span>
        </div>
      </div>

      {qrCodeUrl && (
        <div className="px-8 pb-8 flex justify-end">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Credit Note QR</div>
              <div className="text-[11px] text-gray-500">Scan to open the credit note</div>
            </div>
            <img
              src={qrCodeUrl}
              alt="Credit note QR code"
              className="h-24 w-24 rounded bg-white"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotePreview;
