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

export default function CustomerDetailPurchasesTab({ detail }: { detail: any }) {
    const {
        activeTab,
        bills,
        creditNotes,
        customer,
        customers,
        displayName,
        endDateCalendarMonth,
        endDatePickerRef,
        filteredMergeCustomers,
        getStatementDateRange,
        handleDownloadPDF,
        handleMergeSubmit,
        handlePrintStatementsSubmit,
        handleTemplateSelect,
        invoices,
        isAssociateTemplatesModalOpen,
        isEndDatePickerOpen,
        isLinkEmailDropdownOpen,
        isLinkedVendorPurchasesLoading,
        isMergeCustomerDropdownOpen,
        isMergeModalOpen,
        isPrintStatementsModalOpen,
        isStartDatePickerOpen,
        isStatementDownloading,
        isStatementFilterDropdownOpen,
        isStatementPeriodDropdownOpen,
        linkEmailDropdownRef,
        linkedVendorCredits,
        linkedVendorPaymentsMade,
        linkedVendorPurchaseOrders,
        linkedVendorPurchaseSections,
        linkedVendorPurchases,
        mails,
        mergeCustomerDropdownRef,
        mergeCustomerSearch,
        mergeTargetCustomer,
        navigate,
        organizationName,
        organizationProfile,
        ownerEmail,
        payments,
        pdfTemplateOptions,
        pdfTemplates,
        printStatementEndDate,
        printStatementStartDate,
        renderCalendar,
        setEndDateCalendarMonth,
        setIsAssociateTemplatesModalOpen,
        setIsEndDatePickerOpen,
        setIsLinkEmailDropdownOpen,
        setIsMergeCustomerDropdownOpen,
        setIsMergeModalOpen,
        setIsOutlookIntegrationModalOpen,
        setIsPrintStatementsModalOpen,
        setIsStartDatePickerOpen,
        setIsStatementFilterDropdownOpen,
        setIsStatementPeriodDropdownOpen,
        setIsZohoMailIntegrationModalOpen,
        setMergeCustomerSearch,
        setMergeTargetCustomer,
        handleAssociateTemplatesSave,
        setPrintStatementEndDate,
        setPrintStatementStartDate,
        setStartDateCalendarMonth,
        setStatementFilter,
        setStatementPeriod,
        startDateCalendarMonth,
        startDatePickerRef,
        statementFilter,
        statementFilterDropdownRef,
        statementPeriod,
        statementPeriodDropdownRef,
        statementTransactions,
        toggleLinkedVendorPurchaseSection,
    } = detail as any;
    const { id: routeCustomerId } = useParams();
    const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
    return (
        <>
                {activeTab === "purchases" && (
                        <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
                            <button className="flex items-center gap-2 px-4 py-2 mb-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
                                Go to transactions
                                <ChevronDown size={16} />
                            </button>
                            {isLinkedVendorPurchasesLoading && (
                                <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-sm text-gray-500 text-center">
                                    Loading linked vendor transactions...
                                </div>
                            )}
                            {!isLinkedVendorPurchasesLoading && (
                                <div className="space-y-4">
                                    {[
                                        { key: "bills", label: "Bills", rows: linkedVendorPurchases, navigateTo: "/purchases/bills/" },
                                        { key: "paymentsMade", label: "Bill Payments", rows: linkedVendorPaymentsMade, navigateTo: "/purchases/payments-made/" },
                                        { key: "purchaseOrders", label: "Purchase Orders", rows: linkedVendorPurchaseOrders, navigateTo: "/purchases/purchase-orders/" },
                                        { key: "vendorCredits", label: "Vendor Credits", rows: linkedVendorCredits, navigateTo: "/purchases/vendor-credits/" }
                                    ].map((section: any) => (
                                        <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                            <button
                                                className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100"
                                                onClick={() => toggleLinkedVendorPurchaseSection(section.key)}
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
                                                            const rowDate = row.date || row.billDate || row.paymentDate || row.purchaseOrderDate || row.creditNoteDate;
                                                            const rowAmount = row.total || row.amount || row.amountPaid || 0;
                                                            return (
                                                                <div
                                                                    key={rowId || `${section.key}-${index}`}
                                                                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 text-sm hover:bg-gray-50 cursor-pointer"
                                                                    onClick={() => rowId && navigate(`${section.navigateTo}${rowId}`)}
                                                                >
                                                                    <div className="col-span-3 text-gray-900">{rowDate ? new Date(rowDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</div>
                                                                    <div className="col-span-4 text-blue-600 font-medium">{rowNumber || "-"}</div>
                                                                    <div className="col-span-3 text-gray-900">{formatCurrency(rowAmount, row.currency || customer?.currency || "USD")}</div>
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
                    )}

                {activeTab === "mails" && (
                        <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">System Mails</h3>
                                    <div className="relative" ref={linkEmailDropdownRef}>
                                        <button
                                            className="flex items-center gap-2 text-sm font-medium text-[#0f5ca8] cursor-pointer hover:underline"
                                            onClick={() => setIsLinkEmailDropdownOpen(!isLinkEmailDropdownOpen)}
                                        >
                                            <Mail size={16} className="text-[#0f5ca8]" />
                                            Link Email account
                                            <ChevronDown size={14} />
                                        </button>
                                        {isLinkEmailDropdownOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                                <div
                                                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        setIsLinkEmailDropdownOpen(false);
                                                        setIsZohoMailIntegrationModalOpen(true);
                                                    }}
                                                >
                                                    Zoho Mail
                                                </div>
                                                <div
                                                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        setIsLinkEmailDropdownOpen(false);
                                                        setIsOutlookIntegrationModalOpen(true);
                                                    }}
                                                >
                                                    Connect Outlook
                                                </div>
                                                <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                                                    Connect Other Email
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-200">
                                    {mails.length > 0 ? (
                                        mails.map((mail: any) => (
                                            <div key={String(mail.id)} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm flex-shrink-0">
                                                    {mail.initial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-gray-600 mb-0.5">
                                                        To <span className="font-medium text-gray-900">{mail.to}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-700">
                                                        <span className="font-medium">{mail.subject}</span>
                                                        {String(mail.description || "").trim() && (
                                                            <>
                                                                <span className="text-gray-400"> - </span>
                                                                <span className="text-gray-600">{mail.description}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                                    {mail.date}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                            <Mail size={48} />
                                            <p>No emails sent to this customer yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                {activeTab === "statement" && (
                        <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
                            {/* Statement Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="relative" ref={statementPeriodDropdownRef}>
                                        <button
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => setIsStatementPeriodDropdownOpen(!isStatementPeriodDropdownOpen)}
                                        >
                                            <Calendar size={16} />
                                            {statementPeriod === "this-month" ? "This Month" :
                                                statementPeriod === "last-month" ? "Last Month" :
                                                    statementPeriod === "this-quarter" ? "This Quarter" :
                                                        statementPeriod === "this-year" ? "This Year" : "Custom"}
                                            <ChevronDown size={14} />
                                        </button>
                                        {isStatementPeriodDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementPeriod === "this-month" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementPeriod("this-month"); setIsStatementPeriodDropdownOpen(false); }}>This Month</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementPeriod === "last-month" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementPeriod("last-month"); setIsStatementPeriodDropdownOpen(false); }}>Last Month</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementPeriod === "this-quarter" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementPeriod("this-quarter"); setIsStatementPeriodDropdownOpen(false); }}>This Quarter</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementPeriod === "this-year" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementPeriod("this-year"); setIsStatementPeriodDropdownOpen(false); }}>This Year</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative" ref={statementFilterDropdownRef}>
                                        <button
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => setIsStatementFilterDropdownOpen(!isStatementFilterDropdownOpen)}
                                        >
                                            Filter By: {statementFilter === "all" ? "All" : statementFilter}
                                            <ChevronDown size={14} />
                                        </button>
                                        {isStatementFilterDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementFilter === "all" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementFilter("all"); setIsStatementFilterDropdownOpen(false); }}>All</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementFilter === "invoices" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementFilter("invoices"); setIsStatementFilterDropdownOpen(false); }}>Invoices</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementFilter === "payments" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementFilter("payments"); setIsStatementFilterDropdownOpen(false); }}>Payments</div>
                                                <div className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${statementFilter === "credit-notes" ? "bg-blue-50 text-blue-600" : ""}`} onClick={() => { setStatementFilter("credit-notes"); setIsStatementFilterDropdownOpen(false); }}>Credit Notes</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        className={`p-2 bg-white text-[#156372] hover:bg-[#EAF4F6] border border-gray-300 rounded-md transition-colors shadow-sm ${isStatementDownloading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                                        title="PDF"
                                        onClick={handleDownloadPDF}
                                        disabled={isStatementDownloading}
                                    >
                                        {isStatementDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                    </button>
                                        <button
                                            className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52] transition-colors shadow-sm"
                                            onClick={() => {
                                                const { startDate, endDate } = getStatementDateRange();
                                                navigate(`/sales/customers/${customerId}/send-email-statement`, {
                                                    state: {
                                                        startDate,
                                                        endDate,
                                                    filterBy: statementFilter
                                                }
                                            });
                                        }}
                                    >
                                        <Mail size={16} />
                                        Send Email
                                    </button>
                                </div>
                            </div>

                            {/* Statement Document - A4 Style */}
                            <div
                                className="bg-white shadow-lg mx-auto print-content"
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    padding: '40px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* Document Header */}
                                <div className="flex justify-between items-start mb-12">
                                    {/* Left Side: Logo and Company Info */}
                                    <div className="flex gap-6 items-start">
                                        {/* Logo */}
                                        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                            {organizationProfile?.logo ? (
                                                <img
                                                    src={organizationProfile.logo}
                                                    alt="Organization Logo"
                                                    className="w-full h-full object-contain"
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="text-4xl">📖</div>
                                            )}
                                        </div>

                                        {/* Company Details */}
                                        <div className="flex flex-col">
                                            <div className="text-[18px] font-bold text-gray-900 mb-1">
                                                {organizationProfile?.organizationName || organizationProfile?.name || "TABAN ENTERPRISES"}
                                            </div>
                                            <div className="text-[14px] text-gray-600 leading-relaxed">
                                                {organizationProfile?.address?.street1 && <div>{organizationProfile.address.street1}</div>}
                                                {organizationProfile?.address?.street2 && <div>{organizationProfile.address.street2}</div>}
                                                <div>
                                                    {[
                                                        organizationProfile?.address?.city,
                                                        organizationProfile?.address?.state,
                                                        organizationProfile?.address?.zipCode,
                                                    ].filter(Boolean).join(", ")}
                                                </div>
                                                {organizationProfile?.address?.country && <div>{organizationProfile.address.country}</div>}
                                                <div className="mt-1">{ownerEmail?.email || organizationProfile?.email || ""}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Title and Date */}
                                    <div className="text-right">
                                        <h2 className="text-[32px] font-bold text-gray-900 mb-2">STATEMENT</h2>
                                        <div className="text-[14px] text-gray-600">
                                            {(() => {
                                                const { startDate, endDate } = getStatementDateRange();
                                                return `${startDate.toLocaleDateString('en-GB')} To ${endDate.toLocaleDateString('en-GB')}`;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Bill To Section */}
                                <div className="mb-8">
                                    <div className="text-[14px] font-bold text-gray-900 mb-2">To</div>
                                    <div className="text-[16px] font-medium text-blue-600">{displayName}</div>
                                </div>

                                {/* Account Summary Mini Table */}
                                <div className="mb-10 w-[300px] ml-auto">
                                        <div className="border-t border-b border-gray-200 divide-y divide-gray-100">
                                        <div className="flex justify-between py-2 text-[13px]">
                                            <span className="text-gray-600">Opening Balance</span>
                                            <span className="font-medium text-gray-900">{organizationProfile?.baseCurrency || "KES"} {parseFloat(String(customer?.openingBalance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-[13px]">
                                            <span className="text-gray-600">Invoiced Amount</span>
                                            <span className="font-medium text-gray-900">{organizationProfile?.baseCurrency || "KES"} {invoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total || inv.amount || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-[13px]">
                                            <span className="text-gray-600">Amount Received</span>
                                            <span className="font-medium text-gray-900">{organizationProfile?.baseCurrency || "KES"} {payments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amountReceived || p.amount || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between py-3 border-t-2 border-gray-900 mt-1">
                                        <span className="text-[14px] font-bold text-gray-900">Balance Due</span>
                                        <span className="text-[14px] font-bold text-gray-900">{organizationProfile?.baseCurrency || "KES"} {(parseFloat(String(customer?.openingBalance || 0)) + invoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total || inv.amount || 0)), 0) - payments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amountReceived || p.amount || 0)), 0) - creditNotes.reduce((sum: number, cn: any) => sum + parseFloat(String(cn.total || cn.amount || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Main Transactions Table */}
                                <div className="mb-0">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-[#3d3d3d]">
                                                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Date</th>
                                                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Transactions</th>
                                                <th className="py-3 px-4 text-left text-[12px] font-semibold text-white">Details</th>
                                                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Amount</th>
                                                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Payments</th>
                                                <th className="py-3 px-4 text-right text-[12px] font-semibold text-white">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Opening Balance row if exists */}
                                            {parseFloat(String(customer?.openingBalance || 0)) !== 0 && (
                                                <tr className="bg-white">
                                                    <td className="py-3 px-4 text-[13px] text-gray-900">01 Jan {new Date().getFullYear()}</td>
                                                    <td className="py-3 px-4 text-[13px] text-gray-900">***Opening Balance***</td>
                                                    <td className="py-3 px-4 text-[13px] text-gray-600"></td>
                                                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">{parseFloat(String(customer?.openingBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">0.00</td>
                                                    <td className="py-3 px-4 text-[13px] text-gray-900 text-right">{parseFloat(String(customer?.openingBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                            {statementTransactions.map((transaction: any, index: number) => {
                                                // Calculate row index considering opening balance
                                                const rowIndex = parseFloat(String(customer?.openingBalance || 0)) !== 0 ? index + 1 : index;
                                                const isEven = rowIndex % 2 === 0;

                                                return (
                                                    <tr key={transaction.id} className={isEven ? "bg-white" : "bg-gray-50"}>
                                                        <td className="py-3 px-4 text-[13px] text-gray-900">{new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')}</td>
                                                        <td className="py-3 px-4 text-[13px] text-gray-900">{transaction.type}</td>
                                                        <td className="py-3 px-4 text-[13px] text-blue-600">
                                                            {transaction.detailsLink || ""}
                                                        </td>
                                                        <td className="py-3 px-4 text-[13px] text-gray-900 text-right">{transaction.amount !== 0 ? transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}</td>
                                                        <td className="py-3 px-4 text-[13px] text-gray-900 text-right">{transaction.payments !== 0 ? transaction.payments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}</td>
                                                        <td className="py-3 px-4 text-[13px] text-gray-900 text-right">{transaction.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Transactions Bottom Balance */}
                                <div className="flex justify-end gap-16 py-4 px-4 border-t-2 border-gray-300 mt-2">
                                    <div className="text-[14px] font-bold text-gray-900">Balance Due</div>
                                    <div className="text-[14px] font-bold text-gray-900">
                                        $ {statementTransactions.length > 0 ? statementTransactions[statementTransactions.length - 1].balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : parseFloat(String(customer?.openingBalance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            {
                isPrintStatementsModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Print Customer statements</h2>
                                <button
                                    className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                    onClick={() => setIsPrintStatementsModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-6">
                                    You can print your customer's statements for the selected date range.
                                </p>

                                <div className="mb-4" ref={startDatePickerRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                    <div
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50"
                                        onClick={() => {
                                            setIsStartDatePickerOpen(!isStartDatePickerOpen);
                                            setIsEndDatePickerOpen(false);
                                        }}
                                    >
                                        {formatDateForDisplay(printStatementStartDate)}
                                    </div>
                                    {isStartDatePickerOpen && renderCalendar(
                                        startDateCalendarMonth,
                                        printStatementStartDate,
                                        (date: Date) => {
                                            setPrintStatementStartDate(date);
                                            setIsStartDatePickerOpen(false);
                                        },
                                        () => setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() - 1, 1)),
                                        () => setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() + 1, 1))
                                    )}
                                </div>

                                <div className="mb-4" ref={endDatePickerRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                    <div
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50"
                                        onClick={() => {
                                            setIsEndDatePickerOpen(!isEndDatePickerOpen);
                                            setIsStartDatePickerOpen(false);
                                        }}
                                    >
                                        {formatDateForDisplay(printStatementEndDate)}
                                    </div>
                                    {isEndDatePickerOpen && renderCalendar(
                                        endDateCalendarMonth,
                                        printStatementEndDate,
                                        (date: Date) => {
                                            setPrintStatementEndDate(date);
                                            setIsEndDatePickerOpen(false);
                                        },
                                        () => setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() - 1, 1)),
                                        () => setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() + 1, 1))
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700"
                                    onClick={handlePrintStatementsSubmit}
                                >
                                    Print Statements
                                </button>
                                <button
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                                    onClick={() => setIsPrintStatementsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Merge Customers Modal */}
            {
                isMergeModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-[500px] mx-4">
                            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 m-0">Merge Customers</h2>
                                <button
                                    className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50"
                                    onClick={() => {
                                        setIsMergeModalOpen(false);
                                        setMergeTargetCustomer(null);
                                        setMergeCustomerSearch("");
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-700 mb-4">
                                    Select a customer profile with whom you'd like to merge <strong>{customer?.name || customer?.displayName || displayName}</strong>. Once merged, the transactions of <strong>{customer?.name || customer?.displayName || displayName}</strong> will be transferred, and this customer record will be marked as inactive.
                                </p>
                                <div className="relative" ref={mergeCustomerDropdownRef}>
                                    <div
                                        className="flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-colors hover:border-gray-400"
                                        onClick={() => {
                                            setIsMergeCustomerDropdownOpen(!isMergeCustomerDropdownOpen);
                                            setMergeCustomerSearch("");
                                        }}
                                    >
                                        <span className={mergeTargetCustomer ? "text-gray-700" : "text-gray-400"}>
                                            {mergeTargetCustomer ? mergeTargetCustomer.name || mergeTargetCustomer.displayName : "Select Customer"}
                                        </span>
                                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isMergeCustomerDropdownOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    {isMergeCustomerDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1002] overflow-hidden">
                                            <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                                                <Search size={16} className="text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Search"
                                                    value={mergeCustomerSearch}
                                                    onChange={(e) => setMergeCustomerSearch(e.target.value)}
                                                    autoFocus
                                                    className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto">
                                                {filteredMergeCustomers.length > 0 ? (
                                                    filteredMergeCustomers.map((customer: any, index: number) => (
                                                        <div
                                                            key={`${customer.id}-${index}`}
                                                            className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${mergeTargetCustomer?.id === customer.id ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                                                            onClick={() => {
                                                                setMergeTargetCustomer(customer);
                                                                setIsMergeCustomerDropdownOpen(false);
                                                                setMergeCustomerSearch("");
                                                            }}
                                                        >
                                                            {customer.name || customer.displayName} {customer.companyName && `(${customer.companyName})`}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-2.5 px-3.5 text-sm text-gray-500">No customers found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                                <button
                                    className="py-2.5 px-5 text-sm font-medium text-white bg-red-600 border-none rounded-md cursor-pointer transition-colors hover:bg-red-700"
                                    onClick={handleMergeSubmit}
                                >
                                    Continue
                                </button>
                                <button
                                    className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                                    onClick={() => {
                                        setIsMergeModalOpen(false);
                                        setMergeTargetCustomer(null);
                                        setMergeCustomerSearch("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Associate Templates Modal */}
            {
                isAssociateTemplatesModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Associate Templates</h2>
                                <button
                                    className="p-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50 cursor-pointer"
                                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-6">
                                    Associate PDF templates to this customer.
                                </p>

                                <div className="mb-6 pb-4 border-b border-gray-200 last:border-b-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold text-gray-900">PDF Templates</h3>
                                        <button
                                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                            onClick={() => navigate("/settings/customization/pdf-templates")}
                                        >
                                            <Plus size={16} />
                                            New PDF Template
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Customer Statement</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.customerStatement}
                                                onChange={(e) => handleTemplateSelect("pdf", "customerStatement", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Quotes</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.quotes}
                                                onChange={(e) => handleTemplateSelect("pdf", "quotes", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Invoices</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.invoices}
                                                onChange={(e) => handleTemplateSelect("pdf", "invoices", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Credit Notes</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.creditNotes}
                                                onChange={(e) => handleTemplateSelect("pdf", "creditNotes", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Payment Thank You</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.paymentThankYou}
                                                onChange={(e) => handleTemplateSelect("pdf", "paymentThankYou", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                                    onClick={handleAssociateTemplatesSave}
                                >
                                    Save
                                </button>
                                <button
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
