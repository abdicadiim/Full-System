import React from "react";
import { getInitial, formatCurrency } from "./QuoteDetail.utils";

type Props = {
  quote: any;
  quoteTotalsMeta: any;
  organizationProfile: any;
  ownerEmail: any;
  setIsQuoteDocumentHovered: (value: boolean) => void;
  setIsCustomizeDropdownOpen: (value: boolean) => void;
};

const QuoteDetailPdfDocument = ({
  quote,
  quoteTotalsMeta,
  organizationProfile,
  ownerEmail,
  setIsQuoteDocumentHovered,
  setIsCustomizeDropdownOpen,
}: Props) => {
  return (
    <>
      <div
        className="w-full max-w-[920px] mx-auto bg-white border border-[#d1d5db] shadow-sm overflow-hidden print-content"
        data-print-content
        style={{ width: "210mm", maxWidth: "210mm", minHeight: "297mm", padding: "46px 40px 24px 40px", position: "relative" }}
        onMouseEnter={() => setIsQuoteDocumentHovered(true)}
        onMouseLeave={() => {
          setIsQuoteDocumentHovered(false);
          setIsCustomizeDropdownOpen(false);
        }}
      >
        {String(quote.status || "").toLowerCase() === "draft" && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#6B7280", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              DRAFT
            </div>
          </div>
        )}
        {String(quote.status || "").toLowerCase() === "sent" && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#2F80FF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              SENT
            </div>
          </div>
        )}
        {String(quote.status || "").toLowerCase() === "approved" && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#4CB8D9", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              APPROVED
            </div>
          </div>
        )}
        {String(quote.status || "").toLowerCase() === "accepted" && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#0D4A52", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              ACCEPTED
            </div>
          </div>
        )}
        {(String(quote.status || "").toLowerCase() === "declined" || String(quote.status || "").toLowerCase() === "rejected") && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#f59e0b", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              DECLINED
            </div>
          </div>
        )}
        {(String(quote.status || "").toLowerCase() === "invoiced" || String(quote.status || "").toLowerCase() === "converted") && (
          <div style={{ position: "absolute", top: "0", left: "0", width: "200px", height: "200px", overflow: "hidden", zIndex: 10 }}>
            <div style={{ position: "absolute", top: "40px", left: "-60px", width: "200px", height: "30px", backgroundColor: "#0D4A52", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", transform: "rotate(-45deg)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              INVOICED
            </div>
          </div>
        )}

        <div className="flex items-start justify-between mb-6 pb-5" style={{ position: "relative", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ maxWidth: "46%", paddingLeft: "26px", paddingTop: "4px" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "3px" }}>
              {organizationProfile?.name || ""}
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.45" }}>
              {organizationProfile?.address?.street1 || ""}<br />
              {organizationProfile?.address?.street2 || ""}<br />
              {organizationProfile?.address?.city ?
                `${organizationProfile.address.city}${organizationProfile.address.zipCode ? " " + organizationProfile.address.zipCode : ""}${organizationProfile.address.state ? ", " + organizationProfile.address.state : ""}` :
                ""
              }<br />
              {organizationProfile?.address?.country || ""}<br />
              {ownerEmail?.email || organizationProfile?.email || ""}
            </div>
          </div>
          <div style={{ textAlign: "right", marginTop: "2px" }}>
            <div style={{ fontSize: "40px", lineHeight: "1", letterSpacing: "1.2px", color: "#111827", fontWeight: "500" }}>
              QUOTE
            </div>
            <div style={{ fontSize: "16px", color: "#111827", fontWeight: "700", marginTop: "6px" }}>
              # {quote.quoteNumber || quote.id}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <div style={{ fontSize: "15px", color: "#111827", marginBottom: "4px", fontWeight: "600" }}>
              Bill To
            </div>
            <div style={{ fontSize: "15px", color: "#2563eb", fontWeight: "600", lineHeight: "1.2" }}>
              {quote.customerName || "N/A"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <div style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1" }}>:</div>
            <div style={{ fontSize: "13px", color: "#111827", minWidth: "120px", textAlign: "right" }}>
              {quote.quoteDate || quote.date ? (() => {
                const date = new Date(quote.quoteDate || quote.date);
                return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              })() : "-"}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#3f3f46" }}>
                <th style={{ padding: "9px 12px", textAlign: "center", color: "white", fontSize: "11px", fontWeight: "600", width: "44px" }}>#</th>
                <th style={{ padding: "9px 12px", textAlign: "left", color: "white", fontSize: "11px", fontWeight: "600" }}>Item & Description</th>
                <th style={{ padding: "9px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "600", width: "100px" }}>Qty</th>
                <th style={{ padding: "9px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "600", width: "100px" }}>Rate</th>
                <th style={{ padding: "9px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "600", width: "100px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items && quote.items.length > 0 ? (
                quote.items.map((item: any, index: number) => (
                  <tr key={item.id || index} style={{ borderBottom: "1px solid #d1d5db", backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#111827", textAlign: "center", verticalAlign: "top" }}>{index + 1}</td>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#111827", verticalAlign: "top" }}>
                      <div>
                        <strong style={{ fontWeight: "600" }}>{item.name || item.item?.name || "N/A"}</strong>
                        {item.description && (
                          <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#111827", textAlign: "right", verticalAlign: "top" }}>
                      <div>{Number(item.quantity || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>{item.item?.unit || item.unit || "pcs"}</div>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#111827", textAlign: "right", verticalAlign: "top" }}>
                      {Number(item.unitPrice || item.rate || item.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#111827", textAlign: "right", verticalAlign: "top" }}>
                      {Number(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price || 0))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#666", fontSize: "14px" }}>
                    No items added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-7">
          <div style={{ width: "320px", border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: "8px", backgroundColor: "#fcfcfd" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px", color: "#111827", fontWeight: "600" }}>
              <span>Sub Total</span>
              <span style={{ color: "#111827", fontWeight: "500" }}>
                {Number(quoteTotalsMeta.subTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {quoteTotalsMeta.discount > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px", color: "#4b5563" }}>
                  <span>{quoteTotalsMeta.discountLabel}</span>
                  <span style={{ color: "#111827", fontWeight: "500" }}>
                    (-) {formatCurrency(quoteTotalsMeta.discount, quote.currency)}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "-2px", marginBottom: "6px" }}>
                  (Applied on {formatCurrency(quoteTotalsMeta.discountBase, quote.currency)})
                </div>
              </>
            )}
            {quoteTotalsMeta.taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px", color: "#4b5563" }}>
                <span>{quoteTotalsMeta.taxLabel}</span>
                <span style={{ color: "#111827", fontWeight: "500" }}>
                  {formatCurrency(quoteTotalsMeta.taxAmount, quote.currency)}
                </span>
              </div>
            )}
            {quoteTotalsMeta.shippingCharges !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px", color: "#4b5563" }}>
                <span>Shipping charge</span>
                <span style={{ color: "#111827", fontWeight: "500" }}>
                  {formatCurrency(quoteTotalsMeta.shippingCharges, quote.currency)}
                </span>
              </div>
            )}
            {quoteTotalsMeta.adjustment !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px", color: "#4b5563" }}>
                <span>Adjustment</span>
                <span style={{ color: "#111827", fontWeight: "500" }}>
                  {formatCurrency(quoteTotalsMeta.adjustment, quote.currency)}
                </span>
              </div>
            )}
            {quoteTotalsMeta.roundOff !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px", color: "#4b5563" }}>
                <span>Round Off</span>
                <span style={{ color: "#111827", fontWeight: "500" }}>
                  {formatCurrency(quoteTotalsMeta.roundOff, quote.currency)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", fontSize: "17px", fontWeight: "700", marginTop: "8px", borderRadius: "6px", backgroundColor: "#f3f4f6", color: "#111827" }}>
              <span>Total</span>
              <span>{formatCurrency(quote.total || 0, quote.currency)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "28px", borderTop: "1px dashed #d1d5db", paddingTop: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "6px", letterSpacing: "0.2px" }}>
            Notes
          </div>
          <div style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.5" }}>
            {quote.customerNotes || "Looking forward for your business."}
          </div>
        </div>
        <div style={{ position: "absolute", right: "18px", bottom: "8px", fontSize: "11px", color: "#9ca3af" }}>
          1
        </div>
      </div>

      <div className="w-full max-w-[920px] mx-auto mt-4">
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 text-sm font-semibold text-gray-900">
            More Information
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Salesperson</div>
                <div className="text-sm text-gray-900">{quote.salesperson || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Email Recipients</div>
                {quote.customerEmail ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700">
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#ede9fe] text-[#6d28d9] text-[11px] font-bold">
                      {String(quote.customerEmail).split(",").map((v: string) => v.trim()).filter(Boolean).length || 1}
                    </span>
                    <span className="truncate max-w-[360px]">{quote.customerEmail}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-900">-</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuoteDetailPdfDocument;

