import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI, reportingTagsAPI, senderEmailsAPI } from "../../../services/api";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import {
    X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
    Settings, User, Mail, Phone, MapPin, Globe,
    DollarSign, TrendingUp, Calendar, UserPlus,
    ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline, ChevronRight as ChevronRightIcon,
    Filter, ArrowUpDown, Search, ChevronLeft, Link2, FileText, Monitor, Check, Upload, Trash2, Loader2, Download, RefreshCw, AlertTriangle, Smartphone
} from "lucide-react";
import { Customer, Invoice, CreditNote, AttachedFile, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import CustomerCommentsPanel from "../CustomerDetail/CustomerCommentsPanel";
import CustomerAttachmentsPopover from "../CustomerDetail/CustomerAttachmentsPopover";

import type { ExtendedCustomer, Transaction, Comment, Mail as CustomerMail } from "../CustomerDetail/CustomerDetail.shared";
import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";

export default function CustomerDetailOverviewRight({ detail }: { detail: any }) {
    const { id: routeCustomerId } = useParams();
    const {
        accountingBasis,
        availableCurrencies,
        customer,
        customerSubscriptions,
        filteredInvoices,
        incomeTimePeriod,
        incomeTimePeriodRef,
        invoices,
        isIncomeTimePeriodDropdownOpen,
        isOpeningBalanceModalOpen,
        isSubscriptionDropdownOpen,
        linkedVendor,
        navigate,
        openingBalanceValue,
        payments,
        quotes,
        setCustomer,
        setIncomeTimePeriod,
        setIsIncomeTimePeriodDropdownOpen,
        setIsOpeningBalanceModalOpen,
        setIsSubscriptionDropdownOpen,
        setOpeningBalanceValue,
        subscriptionDropdownRef,
    } = detail as any;
    const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
    return (
        <>
                <div className="flex h-full min-h-0 items-stretch">
                <div className="h-full w-[360px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
                    <div className="border-b border-gray-200 p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Created On:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {customer.createdDate ? new Date(customer.createdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "03/12/2025"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Created By:</span>
                            <span className="text-sm font-medium text-gray-900">{customer.createdBy || "JIRDE HUSSEIN KHALIF"}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="h-full flex-1 min-w-0 bg-white overflow-y-auto px-6 py-4">
                                {/* Payment Terms + Credit Limit */}
                                <div className="mb-4 grid grid-cols-2 gap-10">
                                    <div>
                                        <div className="px-2">
                                            <span className="text-sm text-gray-500">Payment due period</span>
                                        </div>
                                        <div className="px-2 pt-1">
                                            <div className="text-sm text-gray-900">
                                                {customer.paymentTerms === "due-on-receipt" ? "Due on Receipt" : customer.paymentTerms || "Due on Receipt"}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="px-2">
                                            <span className="text-sm text-gray-500">Credit Limit</span>
                                        </div>
                                        <div className="px-2 pt-1">
                                            {(() => {
                                                const raw =
                                                    (customer as any)?.creditLimit ??
                                                    (customer as any)?.credit_limit ??
                                                    (customer as any)?.creditlimit ??
                                                    (customer as any)?.creditLimitAmount ??
                                                    "";

                                                const asString = String(raw ?? "").trim();
                                                if (!asString) {
                                                    return <div className="text-sm text-gray-900">Unlimited</div>;
                                                }
                                                if (asString.toLowerCase() === "unlimited") {
                                                    return <div className="text-sm text-gray-900">Unlimited</div>;
                                                }

                                                const value = Number(asString);
                                                if (!Number.isFinite(value)) {
                                                    return <div className="text-sm text-gray-900">{asString}</div>;
                                                }

                                                return (
                                                    <div className="text-sm text-gray-900">
                                                        {formatCurrency(value, customer.currency || "USD")}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Receivables Section */}
                                <div className="mb-4 border-t border-b border-gray-200 bg-white">
                                    <div className="px-2 py-3">
                                        <span className="text-[15px] font-semibold text-gray-900">Receivables</span>
                                    </div>
                                    <div className="overflow-hidden border-t border-gray-100">
                                        {!isOpeningBalanceModalOpen && (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">CURRENCY</th>
                                                        <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">OUTSTANDING RECEIVABLES</th>
                                                        <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">UNUSED CREDITS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    <tr>
                                                        <td className="py-3 px-4 text-gray-900 font-medium">
                                                            {`${customer.currency || "USD"}- ${availableCurrencies.find((c: any) => c?.code === (customer.currency || "USD"))?.currencyName || availableCurrencies.find((c: any) => c?.code === (customer.currency || "USD"))?.name || "Armenian Dram"}`}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-blue-600 font-medium">
                                                            {formatCurrency(customer.receivables || 0, customer.currency || "USD")}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-gray-900">
                                                            {formatCurrency(customer.unusedCredits || 0, customer.currency || "USD")}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div className="hidden p-4 pt-2 relative">

                                        {isOpeningBalanceModalOpen && (
                                            <div className="absolute top-full left-0 mt-2 z-50 w-[400px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                                                {/* Arrow pointing up */}
                                                <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>

                                                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                                    <h3 className="text-lg font-medium text-gray-900">Edit Opening Balance</h3>
                                                    <button
                                                        onClick={() => setIsOpeningBalanceModalOpen(false)}
                                                        className="w-7 h-7 flex items-center justify-center border-2 border-blue-600 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>

                                                <div className="p-6">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <label className="text-sm font-medium text-gray-700 w-32">Opening Balance</label>
                                                        <input
                                                            type="number"
                                                            value={openingBalanceValue}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpeningBalanceValue(e.target.value)}
                                                            onKeyDown={async (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = parseFloat(openingBalanceValue) || 0;
                                                                    const updatedCustomer = {
                                                                        ...customer,
                                                                        openingBalance: val,
                                                                        receivables: val
                                                                    };
                                                                    try {
                                                                        if (!customerId) {
                                                                            throw new Error("Customer ID not found");
                                                                        }
                                                                        await customersAPI.update(customerId, updatedCustomer);
                                                                        setCustomer(updatedCustomer);
                                                                        setIsOpeningBalanceModalOpen(false);
                                                                    } catch (error: any) {
                                                                        toast.error('Failed to update customer: ' + (error?.message || 'Unknown error'));
                                                                    }
                                                                }
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <button
                                                        onClick={async () => {
                                                                if (customer && customerId) {
                                                                    const val = parseFloat(openingBalanceValue) || 0;
                                                                    const updatedCustomer = {
                                                                        ...customer,
                                                                        openingBalance: val,
                                                                        receivables: val
                                                                    };
                                                                    try {
                                                                        await customersAPI.update(customerId, updatedCustomer);
                                                                        setCustomer(updatedCustomer);
                                                                        setIsOpeningBalanceModalOpen(false);
                                                                    } catch (error: any) {
                                                                        toast.error('Failed to update customer: ' + (error?.message || 'Unknown error'));
                                                                    }
                                                                }
                                                            }}
                                                            className="px-5 py-2 bg-blue-500 text-white rounded font-medium text-sm hover:bg-blue-600 cursor-pointer transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Credit Limit Exceeded Warning */}
                                {(() => {
                                    const raw =
                                        (customer as any)?.creditLimit ??
                                        (customer as any)?.credit_limit ??
                                        (customer as any)?.creditlimit ??
                                        (customer as any)?.creditLimitAmount ??
                                        "";

                                    const asString = String(raw ?? "").trim();
                                    if (!asString) return null;
                                    if (asString.toLowerCase() === "unlimited") return null;

                                    const limitValue = Number(asString);
                                    if (!Number.isFinite(limitValue)) return null;

                                    const receivablesValue = Number((customer as any)?.receivables ?? 0);
                                    if (!Number.isFinite(receivablesValue)) return null;

                                    if (receivablesValue <= limitValue) return null;

                                    const exceededBy = receivablesValue - limitValue;
                                    return (
                                        <div className="mb-4 bg-white px-4 py-3 flex items-center gap-2 text-sm text-orange-600">
                                            <AlertTriangle size={16} className="text-orange-500" />
                                            <span>
                                                Credit limit is being exceeded by {formatCurrency(exceededBy, customer.currency || "USD")}
                                            </span>
                                        </div>
                                    );
                                })()}

                                {customer.linkedVendorId && (
                                    <div className="mb-4 border-t border-b border-gray-200 bg-white">
                                        <div className="p-4 border-b border-gray-200">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payables</span>
                                        </div>
                                        <div className="overflow-hidden border-t border-gray-100">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">CURRENCY</th>
                                                        <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">OUTSTANDING PAYABLES</th>
                                                        <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">UNUSED CREDITS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    <tr>
                                                        <td className="py-3 px-4 text-gray-900 font-medium">
                                                            {customer.currency || "USD"}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-gray-900">
                                                            {formatCurrency(linkedVendor?.payables || 0, customer.currency || "USD")}
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                                                            {formatCurrency(linkedVendor?.unusedCredits || 0, customer.currency || "USD")}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-4 pt-2 border-t border-gray-100">
                                            <div className="text-xs text-gray-500">
                                                Linked Vendor: <span className="font-medium text-gray-900">{customer.linkedVendorName || linkedVendor?.name || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {false && (customerSubscriptions.length === 0 ? (
                                    <div className="mb-4 rounded border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                                        <div className="mb-4 text-sm text-gray-500">No subscriptions have been created for this customer yet.</div>
                                        <div className="relative inline-flex" ref={subscriptionDropdownRef}>
                                            <div className="flex items-center">
                                                <button
                                                    className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-4 rounded-l-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                                                    style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                                                    onClick={() => navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } })}
                                                >
                                                    <Plus size={16} /> New
                                                </button>
                                                <button
                                                    className="h-[38px] w-10 cursor-pointer transition-all text-white rounded-r-lg border-[#0B3A41] border-b-[4px] border-l border-white/20 hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center"
                                                    style={{ background: "#0D4A52" }}
                                                    onClick={() => setIsSubscriptionDropdownOpen(!isSubscriptionDropdownOpen)}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            {isSubscriptionDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50 text-left overflow-hidden">
                                                    <div
                                                        className="px-4 py-2 text-sm text-white cursor-pointer transition-colors"
                                                        style={{ backgroundColor: "#156372" }}
                                                        onClick={() => {
                                                            setIsSubscriptionDropdownOpen(false);
                                                            navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                                        }}
                                                    >
                                                        New Subscription
                                                    </div>
                                                    <div
                                                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => {
                                                            setIsSubscriptionDropdownOpen(false);
                                                            navigate("/sales/quotes/subscription/new", { state: { customerId: customer?.id, customerName: customer?.name, forSubscription: true } });
                                                        }}
                                                    >
                                                        Create Quote for Subscription
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 border-t border-b border-gray-200 bg-white">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">SUBSCRIPTIONS</span>
                                            <div className="relative inline-flex" ref={subscriptionDropdownRef}>
                                                <div className="flex items-center">
                                                    <button
                                                        className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-4 rounded-l-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                                                        style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                                                        onClick={() => navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } })}
                                                    >
                                                        <Plus size={16} /> New
                                                    </button>
                                                    <button
                                                        className="h-[38px] w-10 cursor-pointer transition-all text-white rounded-r-lg border-[#0B3A41] border-b-[4px] border-l border-white/20 hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center"
                                                        style={{ background: "#0D4A52" }}
                                                        onClick={() => setIsSubscriptionDropdownOpen(!isSubscriptionDropdownOpen)}
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>

                                                {isSubscriptionDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50 text-left overflow-hidden">
                                                        <div
                                                            className="px-4 py-2 text-sm text-white cursor-pointer transition-colors"
                                                            style={{ backgroundColor: "#156372" }}
                                                            onClick={() => {
                                                                setIsSubscriptionDropdownOpen(false);
                                                                navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                                            }}
                                                        >
                                                            New Subscription
                                                        </div>
                                                        <div
                                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                                                            onClick={() => {
                                                                setIsSubscriptionDropdownOpen(false);
                                                                navigate("/sales/quotes/subscription/new", { state: { customerId: customer?.id, customerName: customer?.name, forSubscription: true } });
                                                            }}
                                                        >
                                                            Create Quote for Subscription
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="divide-y divide-gray-200">
                                            {customerSubscriptions.map((sub: any) => {
                                                const normalizeText = (value: any) => String(value ?? "").trim();
                                                const pick = (...values: any[]) => values.find((v) => normalizeText(v));

                                                const name = normalizeText(
                                                    pick(
                                                        sub?.planName,
                                                        sub?.plan_name,
                                                        sub?.plan?.name,
                                                        sub?.plan?.planName,
                                                        sub?.productName,
                                                        sub?.product?.name,
                                                        sub?.subscriptionName,
                                                        sub?.subscription_name,
                                                        sub?.items?.[0]?.itemDetails,
                                                        sub?.items?.[0]?.name,
                                                        sub?.items?.[0]?.label,
                                                        sub?.addonLines?.[0]?.addonName,
                                                        sub?.addonLines?.[0]?.name,
                                                        sub?.addons?.[0]?.name,
                                                        sub?.name,
                                                        "Subscription"
                                                    )
                                                );
                                                const description = normalizeText(
                                                    pick(
                                                        sub?.planDescription,
                                                        sub?.plan_description,
                                                        sub?.plan?.description,
                                                        sub?.description,
                                                        sub?.notes,
                                                        sub?.summary,
                                                        ""
                                                    )
                                                );
                                                const subId = sub?.subscriptionId || sub?.referenceId || sub?.id || sub?._id || "";
                                                const subNumber = sub?.subscriptionNumber || sub?.number || sub?.code || "";
                                                const amountRaw = sub?.amount ?? sub?.total ?? sub?.amountDue ?? 0;
                                                let currency = String(sub?.currency || customer?.currency || "USD");
                                                let amountValue = 0;
                                                if (typeof amountRaw === "string") {
                                                    const currencyMatch = amountRaw.match(/^[A-Za-z]+/);
                                                    if (currencyMatch?.[0]) currency = currencyMatch[0];
                                                    amountValue = Number(amountRaw.replace(/[^\d.]/g, "")) || 0;
                                                } else {
                                                    amountValue = Number(amountRaw) || 0;
                                                }
                                                const statusRaw = String(sub?.status || sub?.state || "LIVE").toUpperCase();
                                                const lastBilling = sub?.lastBilledOn || sub?.lastBillingDate || sub?.lastBilledDate || sub?.lastBillingOn;
                                                const nextBilling = sub?.nextBillingOn || sub?.nextBillingDate || sub?.nextBillDate;

                                                const isUnpaid =
                                                    statusRaw.includes("UNPAID") ||
                                                    statusRaw.includes("OVERDUE") ||
                                                    statusRaw.includes("DUE");
                                                const isLive =
                                                    statusRaw.includes("LIVE") ||
                                                    statusRaw.includes("ACTIVE");

                                                const statusDotClass = isUnpaid ? "bg-red-500" : isLive ? "bg-green-500" : "bg-gray-400";
                                                const statusTextClass = isUnpaid ? "text-red-600" : isLive ? "text-green-600" : "text-gray-600";

                                                return (
                                                    <div key={String(subId || subNumber || name)} className="px-4 py-6">
                                                        <div className="flex items-start justify-between gap-8">
                                                            <div className="min-w-0">
                                                                <div className="text-base font-medium text-blue-600">
                                                                    <span>{name}</span>
                                                                    {description && (
                                                                        <span className="ml-1 text-xs font-normal text-gray-500">({description})</span>
                                                                    )}
                                                                </div>

                                                                <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                                                                    {subId && <div>Subscription ID : {subId}</div>}
                                                                    {subNumber && <div>Subscription# : {subNumber}</div>}
                                                                </div>
                                                            </div>

                                                            <div className="text-right flex-shrink-0">
                                                                <div className="text-xl font-semibold text-gray-900">
                                                                    {formatCurrency(amountValue || 0, currency)}
                                                                </div>
                                                                <div className={`mt-0.5 inline-flex items-center justify-end gap-2 text-[11px] font-semibold ${statusTextClass}`}>
                                                                    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
                                                                    <span>{statusRaw}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {(lastBilling || nextBilling) && (
                                                            <div className="mt-5 text-sm text-gray-600">
                                                                {lastBilling && (
                                                                    <span>Last Billing Date : {formatDateForDisplay(lastBilling)}</span>
                                                                )}
                                                                {nextBilling && (
                                                                    <span className={lastBilling ? "ml-4" : ""}>
                                                                        Next Billing Date : {formatDateForDisplay(nextBilling)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Income Section */}
                                <div className="mb-6 border-t border-b border-gray-200 bg-white">
                                    <div className="flex items-start justify-between px-2 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[15px] font-semibold text-gray-900">Income and Expense</span>
                                            <span className="text-[11px] text-gray-500">
                                                This chart is displayed in the organization's base currency.
                                            </span>
                                        </div>
                                        <div className="relative" ref={incomeTimePeriodRef}>
                                            <button
                                                onClick={() => setIsIncomeTimePeriodDropdownOpen(!isIncomeTimePeriodDropdownOpen)}
                                                className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer"
                                            >
                                                {incomeTimePeriod}
                                                <ChevronDown size={14} className={`transition-transform duration-200 ${isIncomeTimePeriodDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isIncomeTimePeriodDropdownOpen && (
                                                <div className="absolute top-full right-0 mt-1 w-[200px] bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                                                    {["This Fiscal Year", "Previous Fiscal Year", "Last 12 Months", "Last 6 Months"].map((period) => (
                                                        <button
                                                            key={period}
                                                            onClick={() => {
                                                                setIncomeTimePeriod(period);
                                                                setIsIncomeTimePeriodDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${incomeTimePeriod === period ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            {period}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-2 pb-4">
                                        {(() => {
                                            // Calculate income based on invoices
                                            const now = new Date();
                                            let filteredInvoices = [...invoices];

                                            // Filter by time period
                                            if (incomeTimePeriod === "This Fiscal Year") {
                                                const fiscalYearStart = new Date(now.getFullYear(), 6, 1); // July 1st
                                                filteredInvoices = invoices.filter((inv: Invoice) => {
                                                    const invDate = new Date(inv.invoiceDate || inv.date || (inv as any).createdAt);
                                                    return invDate >= fiscalYearStart && invDate <= now;
                                                });
                                            } else if (incomeTimePeriod === "Previous Fiscal Year") {
                                                const prevFiscalYearStart = new Date(now.getFullYear() - 1, 6, 1);
                                                const prevFiscalYearEnd = new Date(now.getFullYear(), 5, 30);
                                                filteredInvoices = invoices.filter((inv: Invoice) => {
                                                    const invDate = new Date(inv.invoiceDate || inv.date || (inv as any).createdAt);
                                                    return invDate >= prevFiscalYearStart && invDate <= prevFiscalYearEnd;
                                                });
                                            } else if (incomeTimePeriod === "Last 12 Months") {
                                                const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
                                                filteredInvoices = invoices.filter((inv: Invoice) => {
                                                    const invDate = new Date(inv.invoiceDate || inv.date || (inv as any).createdAt);
                                                    return invDate >= twelveMonthsAgo && invDate <= now;
                                                });
                                            } else if (incomeTimePeriod === "Last 6 Months") {
                                                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                                                filteredInvoices = invoices.filter((inv: Invoice) => {
                                                    const invDate = new Date(inv.invoiceDate || inv.date || (inv as any).createdAt);
                                                    return invDate >= sixMonthsAgo && invDate <= now;
                                                });
                                            }

                                                // Filter by accounting basis
                                            if (accountingBasis === "Cash") {
                                                // Only count invoices that have been paid
                                                filteredInvoices = filteredInvoices.filter((inv: Invoice) => {
                                                    const paidAmount = payments
                                                        .filter((payment: any) => payment.invoiceId === inv.id || payment.invoiceId === (inv as any)._id || payment.invoiceNumber === inv.invoiceNumber)
                                                        .reduce((sum: number, payment: any) => sum + parseFloat(String(payment.amountReceived || payment.amount || 0)), 0);
                                                    const invoiceTotal = parseFloat(String(inv.total || inv.amount || 0));
                                                    return paidAmount >= invoiceTotal;
                                                });
                                            }

                                            // Calculate total income
                                            const totalIncome = filteredInvoices.reduce((sum, inv: Invoice) => {
                                                const amount = parseFloat(String(inv.total || inv.amount || (inv as any).subtotal || 0));
                                                return sum + amount;
                                            }, 0);

                                            // Monthly data for chart
                                            const getMonthlyData = () => {
                                                const periods: { label: string; year: number; month: number; total: number }[] = [];
                                                const now = new Date();

                                                if (incomeTimePeriod === "Last 6 Months" || incomeTimePeriod === "Last 12 Months") {
                                                    const count = incomeTimePeriod === "Last 6 Months" ? 6 : 12;
                                                    for (let i = count - 1; i >= 0; i--) {
                                                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                                        periods.push({
                                                            label: d.toLocaleString('en-US', { month: 'short' }),
                                                            year: d.getFullYear(),
                                                            month: d.getMonth(),
                                                            total: 0
                                                        });
                                                    }
                                                } else if (incomeTimePeriod === "This Fiscal Year") {
                                                    const startMonth = 6; // July
                                                    const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
                                                    for (let i = 0; i < 12; i++) {
                                                        const d = new Date(fiscalYearStart, startMonth + i, 1);
                                                        if (d > now) break;
                                                        periods.push({
                                                            label: d.toLocaleString('en-US', { month: 'short' }),
                                                            year: d.getFullYear(),
                                                            month: d.getMonth(),
                                                            total: 0
                                                        });
                                                    }
                                                } else if (incomeTimePeriod === "Previous Fiscal Year") {
                                                    const startMonth = 6; // July
                                                    const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() - 1 : now.getFullYear() - 2;
                                                    for (let i = 0; i < 12; i++) {
                                                        const d = new Date(fiscalYearStart, startMonth + i, 1);
                                                        periods.push({
                                                            label: d.toLocaleString('en-US', { month: 'short' }),
                                                            year: d.getFullYear(),
                                                            month: d.getMonth(),
                                                            total: 0
                                                        });
                                                    }
                                                }

                                                // Fill data
                                                filteredInvoices.forEach(inv => {
                                                    const invDate = new Date(String(inv.invoiceDate || inv.date || inv.createdAt || 0));
                                                    const period = periods.find(p => p.year === invDate.getFullYear() && p.month === invDate.getMonth());
                                                    if (period) {
                                                        period.total += parseFloat(String(inv.total || inv.amount || 0));
                                                    }
                                                });

                                                return periods;
                                            };

                                            const chartData = getMonthlyData();
                                            const maxVal = Math.max(...chartData.map(d => d.total), 1000);
                                            const hasIncomeData = chartData.some((d) => d.total > 0);
                                            const chartHeight = 160;
                                            const chartWidth = 400;

                                            return (
                                                <>
                                                    <div className="h-56 rounded-md p-4 mb-4 relative overflow-hidden">
                                                        <div className="h-full w-full relative">
                                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                                {[0, 1, 2, 3, 4].map(i => (
                                                                    <div key={i} className="w-full border-t border-gray-200 h-0"></div>
                                                                ))}
                                                            </div>
                                                            {hasIncomeData && (
                                                                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                                                                    <path
                                                                        d={`M 0 ${chartHeight} ${chartData.map((d, i) =>
                                                                            `L ${(i / (chartData.length - 1)) * chartWidth} ${chartHeight - (d.total / maxVal) * chartHeight * 0.8}`
                                                                        ).join(' ')} L ${chartWidth} ${chartHeight} Z`}
                                                                        fill="rgba(59, 130, 246, 0.10)"
                                                                    />
                                                                    <polyline
                                                                        fill="none"
                                                                        stroke="#3b82f6"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        points={chartData.map((d, i) =>
                                                                            `${(i / (chartData.length - 1)) * chartWidth},${chartHeight - (d.total / maxVal) * chartHeight * 0.8}`
                                                                        ).join(' ')}
                                                                    />
                                                                </svg>
                                                            )}
                                                            <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between px-1">
                                                                {chartData.map((d, i) => (
                                                                    <span key={i} className="text-[10px] text-gray-400 font-medium">{d.label}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-lg font-medium text-gray-900 pt-4 border-t border-gray-200">
                                                        Total Income ({incomeTimePeriod}) - {formatCurrency(totalIncome, customer.currency?.substring(0, 3) || "USD")}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                </div>
            </div>
        </>
    );
}
