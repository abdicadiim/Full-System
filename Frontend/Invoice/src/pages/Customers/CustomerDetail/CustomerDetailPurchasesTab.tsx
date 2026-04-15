import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type PurchaseSection = {
  key: string;
  label: string;
  rows: any[];
  navigateTo: string;
};

type CustomerDetailPurchasesTabProps = {
  isLoading: boolean;
  customerCurrency?: string;
  linkedVendorPurchaseSections: Record<string, boolean>;
  sections: PurchaseSection[];
  formatCurrency: (amount: any, currency?: string) => string;
  onToggleSection: (sectionKey: string) => void;
  onNavigate: (path: string) => void;
};

export default function CustomerDetailPurchasesTab({
  isLoading,
  customerCurrency,
  linkedVendorPurchaseSections,
  sections,
  formatCurrency,
  onToggleSection,
  onNavigate,
}: CustomerDetailPurchasesTabProps) {
  return (
    <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
      <div className="mb-4 text-sm text-gray-600">Linked vendor transactions</div>

      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-sm text-gray-500 text-center">
          Loading linked vendor transactions...
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => onToggleSection(section.key)}
              >
                {linkedVendorPurchaseSections[section.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {section.label}
              </button>

              {linkedVendorPurchaseSections[section.key] && (
                <div className="bg-white border-t border-gray-200">
                  {section.rows.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500">No transactions found.</div>
                  ) : (
                    section.rows.map((row: any, index: number) => {
                      const rowId = String(row._id || row.id || "");
                      const rowNumber =
                        row.billNumber ||
                        row.paymentNumber ||
                        row.purchaseOrderNumber ||
                        row.vendorCreditNumber ||
                        row.creditNoteNumber ||
                        rowId;
                      const rowDate =
                        row.date || row.billDate || row.paymentDate || row.purchaseOrderDate || row.creditNoteDate;
                      const rowAmount = row.total || row.amount || row.amountPaid || 0;

                      return (
                        <div
                          key={rowId || `${section.key}-${index}`}
                          className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 text-sm hover:bg-gray-50 cursor-pointer"
                          onClick={() => rowId && onNavigate(`${section.navigateTo}${rowId}`)}
                        >
                          <div className="col-span-3 text-gray-900">
                            {rowDate
                              ? new Date(rowDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </div>
                          <div className="col-span-4 text-blue-600 font-medium">{rowNumber || "-"}</div>
                          <div className="col-span-3 text-gray-900">
                            {formatCurrency(rowAmount, row.currency || customerCurrency || "USD")}
                          </div>
                          <div className="col-span-2 text-gray-600">{row.status || "-"}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
