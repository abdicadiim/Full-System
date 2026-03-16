import React from 'react';
import { CreditNote } from '../../salesModel';

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
    const formatCurrency = (amount: number, currency?: string) => {
        const curr = (currency || baseCurrency || 'USD');
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: curr,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const items = creditNote.items || [];
    const subtotal = (creditNote.subtotal ?? creditNote.subTotal ?? items.reduce((s: any, it: any) => s + (parseFloat(it.total || it.amount || 0) || (parseFloat(it.quantity || 0) * parseFloat(it.unitPrice || it.rate || 0))), 0)) || 0;
    const total = (creditNote.total ?? creditNote.amount) || 0;
    const balance = creditNote.balance ?? total;

    return (
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 relative">
            {/* Status Ribbon */}
            {(creditNote.status === 'open' || creditNote.status === 'draft') && (
                <div className="absolute top-8 -left-12 w-48 text-center py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold uppercase tracking-wider transform -rotate-45 shadow-lg z-10">
                    {creditNote.status}
                </div>
            )}

            {/* Header Section */}
            <div className="p-8 border-b border-gray-200">
                <div className="flex justify-between items-start">
                    {/* Company Info */}
                    <div className="flex-1 mt-4 ml-8">
                        {/* Added margin to avoid overlap with ribbon */}
                        {organizationProfile?.logo ? (
                            <img
                                src={organizationProfile.logo}
                                alt="Company Logo"
                                className="h-16 w-auto mb-3"
                            />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 mb-2">
                                {organizationProfile?.organizationName || 'Taban Enterprise'}
                            </div>
                        )}
                        <div className="text-sm text-gray-600 space-y-0.5">
                            {organizationProfile?.addressLine1 && <div>{organizationProfile.addressLine1}</div>}
                            {organizationProfile?.addressLine2 && <div>{organizationProfile.addressLine2}</div>}
                            {(organizationProfile?.city || organizationProfile?.state || organizationProfile?.zipCode) && (
                                <div>
                                    {[organizationProfile?.city, organizationProfile?.state, organizationProfile?.zipCode]
                                        .filter(Boolean)
                                        .join(' ')}
                                </div>
                            )}
                            {organizationProfile?.country && <div>{organizationProfile.country}</div>}
                            {organizationProfile?.email && <div>{organizationProfile.email}</div>}
                        </div>
                    </div>

                    {/* Credit Note Summary */}
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

            {/* Bill To & Info Section */}
            <div className="p-8 border-b border-gray-200">
                <div className="flex justify-between">
                    {/* Bill To */}
                    <div className="flex-1">
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                            Bill To
                        </div>
                        <div
                            className={`text-base font-semibold text-blue-600 mb-1 ${creditNote.customerId ? 'cursor-pointer hover:underline' : ''}`}
                            onClick={() => creditNote.customerId && onCustomerClick?.(creditNote.customerId)}
                        >
                            {creditNote.customerName ||
                                (typeof creditNote.customer === 'object'
                                    ? (creditNote.customer?.displayName || creditNote.customer?.name)
                                    : creditNote.customer) || '-'}
                        </div>
                    </div>

                    {/* Credit Note Details */}
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
                    </div>
                </div>
            </div>

            {/* Items Table */}
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
                                        {item.itemDetails || item.itemName || item.name || '-'}
                                    </div>
                                    {item.description && (
                                        <div className="text-xs text-gray-500 mt-1 pre-wrap">{item.description}</div>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-right text-sm text-gray-900">
                                    {parseFloat(item.quantity || 0).toFixed(2)}
                                    {item.unit && <span className="text-gray-400 text-xs ml-1">{item.unit}</span>}
                                </td>
                                <td className="py-4 px-4 text-right text-sm text-gray-900">
                                    {formatCurrency(item.unitPrice || item.rate || 0, creditNote.currency).replace(/[A-Z]{3}\s?/, '')}
                                </td>
                                <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                                    {formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate)) || 0, creditNote.currency).replace(/[A-Z]{3}\s?/, '')}
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

            {/* Summary Section */}
            <div className="px-8 pb-8">
                <div className="flex justify-end">
                    <div className="w-80 space-y-3">
                        <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                            <span className="text-gray-600 font-medium">Sub Total</span>
                            <span className="font-medium text-gray-900">
                                {formatCurrency(subtotal, creditNote.currency).replace(/[A-Z]{3}\s?/, '')}
                            </span>
                        </div>

                        {(creditNote.discount || 0) > 0 && (
                            <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Discount</span>
                                <span className="font-medium text-gray-900">
                                    -{formatCurrency(creditNote.discount || 0, creditNote.currency).replace(/[A-Z]{3}\s?/, '')}
                                </span>
                            </div>
                        )}

                        {(creditNote.shipping || 0) > 0 && (
                            <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Shipping</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(creditNote.shipping || 0, creditNote.currency).replace(/[A-Z]{3}\s?/, '')}
                                </span>
                            </div>
                        )}

                        {(creditNote.tax || creditNote.vat || (creditNote.taxes && creditNote.taxes.length > 0)) && (
                            <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                                <span className="text-gray-600 font-medium">VAT</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(
                                        creditNote.tax ?? creditNote.vat ?? (Array.isArray(creditNote.taxes) ? creditNote.taxes.reduce((s: any, t: any) => s + (t.amount || 0), 0) : 0),
                                        creditNote.currency
                                    ).replace(/[A-Z]{3}\s?/, '')}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between py-2 text-sm font-bold text-gray-900 border-b border-gray-100">
                            <span>Total</span>
                            <span>
                                {formatCurrency(total, creditNote.currency)}
                            </span>
                        </div>

                        {/* Credits Used - Calculated as Total - Balance */}
                        {(total - balance) > 0 && (
                            <div className="flex justify-between py-2 text-sm text-red-500">
                                <span>Credits Used</span>
                                <span className="font-medium">
                                    (-) {(total - balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* Footer */}
            <div className="px-8 py-6 mt-4 text-right">
                <div className="text-xs text-gray-500">
                    PDF Template : <span className="text-blue-500 cursor-pointer hover:underline">'Standard Template'</span> <span className="text-blue-500 cursor-pointer hover:underline mx-1">Change</span>
                </div>
            </div>
        </div>
    );
};

export default CreditNotePreview;
