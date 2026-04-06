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

export default function CustomerDetailMainHeader({ detail }: { detail: any }) {
    const { id: routeCustomerId } = useParams();
    const {
        activeTab,
        areRemindersStopped,
        attachments,
        attachmentsDropdownRef,
        comments,
        customer,
        customers,
        displayName,
        expenses,
        handleAssociateTemplates,
        handleClone,
        handleFileUpload,
        handleMergeCustomers,
        handleRemoveAttachment,
        invoices,
        isAttachmentsDropdownOpen,
        isCustomerActive,
        isMoreDropdownOpen,
        isNewTransactionDropdownOpen,
        isUploadingAttachments,
        journals,
        mails,
        moreDropdownRef,
        navigate,
        newTransactionDropdownRef,
        openTransactionSection,
        payments,
        projects,
        quotes,
        selectedTransactionType,
        setActiveStatus,
        setActiveTab,
        setAreRemindersStopped,
        setIsAttachmentsDropdownOpen,
        setIsConfigurePortalModalOpen,
        setIsDeleteModalOpen,
        setIsMoreDropdownOpen,
        setIsNewTransactionDropdownOpen,
        setPortalAccessContacts,
        setShowActionHeader,
        showActionHeader,
    } = detail as any;
    const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
    return (
        <>
            {/* Main Content */}
            <div className="w-full min-w-0 bg-white" style={{ marginRight: 0, paddingRight: 0 }}>
                <div className="sticky top-0 z-30 bg-white">
                {/* Header - Show action header when showActionHeader is true, otherwise show normal header */}
                {!isCustomerActive(customer) ? (
                    /* Action Header Bar */
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {customer?.name || customer?.displayName || customer?.companyName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Customer'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={async () => {
                                    await setActiveStatus(true);
                                }}
                            >
                                Mark as Active
                            </button>
                            <div className="flex items-center justify-center gap-1 min-w-[44px] h-[38px] px-3 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium">
                                <Paperclip size={14} />
                                {attachments.length}
                            </div>
                            <button
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                    setIsMoreDropdownOpen(false);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                                Delete
                            </button>
                            <button
                                className="flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-md text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => navigate("/sales/customers")}
                                title="Back to Customers List"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Normal Header */
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {customer?.name || customer?.displayName || customer?.companyName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Customer'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/sales/customers/${customerId}/edit`)}
                                className="h-[38px] flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                                style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                            >
                                <Edit size={16} />
                                Edit
                            </button>
                            <div className="relative" ref={attachmentsDropdownRef}>
                                <button
                                    className="h-8 min-w-8 rounded border border-gray-200 bg-white px-2 cursor-pointer flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50"
                                    onClick={() => setIsAttachmentsDropdownOpen(!isAttachmentsDropdownOpen)}
                                    aria-label="Attachments"
                                    title="Attachments"
                                >
                                    <Paperclip size={14} strokeWidth={2} />
                                    <span className="text-[12px] font-medium leading-none">{attachments.length}</span>
                                </button>
                                <CustomerAttachmentsPopover
                                    open={isAttachmentsDropdownOpen}
                                    onClose={() => setIsAttachmentsDropdownOpen(false)}
                                    attachments={attachments}
                                    isUploading={isUploadingAttachments}
                                    onUpload={handleFileUpload}
                                    onRemoveAttachment={handleRemoveAttachment}
                                />
                            </div>
                            <div className="relative inline-flex" ref={newTransactionDropdownRef}>
                                <div className="flex items-center">
                                    <button
                                        className="h-[38px] min-w-[140px] cursor-pointer transition-all text-white px-4 rounded-l-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                                        style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                                        onClick={() => setIsNewTransactionDropdownOpen(!isNewTransactionDropdownOpen)}
                                    >
                                        <Plus size={16} />
                                        New Transaction
                                    </button>
                                    <button
                                        className="h-[38px] w-10 cursor-pointer transition-all text-white rounded-r-lg border-[#0B3A41] border-b-[4px] border-l border-white/20 hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center"
                                        style={{ background: "#0D4A52" }}
                                        onClick={() => setIsNewTransactionDropdownOpen(!isNewTransactionDropdownOpen)}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                                {isNewTransactionDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[360px] overflow-y-auto">
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">SALES</div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Subscription
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Invoice
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/payments/payments-received/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Customer Payment
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/payments/payment-links/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Payment Link
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/quotes/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Quote
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/quotes/subscription/new", { state: { customerId: customer?.id, customerName: customer?.name, forSubscription: true } });
                                            }}
                                        >
                                            Quote for Subscription
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/retainer-invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Retainer Invoice
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/recurring-invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Recurring Invoice
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/purchases/expenses/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Expense
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/expenses/recurring-expenses/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Recurring Expense
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/accountant/manual-journals/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Journal
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/credit-notes/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Credit Note
                                        </div>
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/sales/sales-receipts/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Sales Receipt
                                        </div>
                                        <div className="my-1 h-px bg-gray-200" />
                                        <div
                                            className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setIsNewTransactionDropdownOpen(false);
                                                navigate("/projects/new", { state: { customerId: customer?.id, customerName: customer?.name } });
                                            }}
                                        >
                                            Project
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="relative" ref={moreDropdownRef}>
                                <button
                                    className="h-[38px] flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 border-b-[4px] text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                                    onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                                >
                                    More
                                    <ChevronDown size={14} />
                                </button>
                                {isMoreDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={handleAssociateTemplates}
                                        >
                                            Associate Templates
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => {
                                                setIsMoreDropdownOpen(false);
                                                // Initialize portal access contacts from customer contact persons
                                                const contacts = customer?.contactPersons?.map((contact: any) => ({
                                                    id: contact.id || Date.now() + Math.random(),
                                                    name: `${contact.salutation ? `${contact.salutation}. ` : ''}${contact.firstName} ${contact.lastName}`,
                                                    email: contact.email || '',
                                                    hasAccess: contact.hasPortalAccess || false
                                                })) || [];
                                                // If no contact persons, add the customer as a contact
                                                if (contacts.length === 0 && customer.name) {
                                                    contacts.push({
                                                        id: 'customer-main',
                                                        name: customer.name,
                                                        email: customer.email || '',
                                                        hasAccess: customer.enablePortal || false
                                                    });
                                                }
                                                setPortalAccessContacts(contacts);
                                                setIsConfigurePortalModalOpen(true);
                                            }}
                                        >
                                            Configure Customer Portal
                                        </button>
                                          <button
                                              className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${areRemindersStopped
                                                  ? "text-gray-700 hover:bg-gray-50"
                                                  : "text-blue-600 font-medium hover:bg-blue-50"
                                                  }`}
                                              onClick={async () => {
                                                  setIsMoreDropdownOpen(false);
                                                  const nextStopped = !areRemindersStopped;
                                                  const customerId = String(customer?.id || customer?._id || "").trim();
                                                  if (!customerId) {
                                                      toast.error("Customer ID not found. Please refresh and try again.");
                                                      return;
                                                  }

                                                  try {
                                                      if (nextStopped) {
                                                          await customersAPI.disablePaymentReminders(customerId);
                                                      } else {
                                                          await customersAPI.enablePaymentReminders(customerId);
                                                      }
                                                      setAreRemindersStopped(nextStopped);
                                                      toast.success(nextStopped ? "All reminders stopped for this customer" : "All reminders enabled for this customer");
                                                  } catch (error: any) {
                                                      toast.error(error?.message || "Failed to update reminders.");
                                                  }
                                              }}
                                          >
                                            {areRemindersStopped ? "Enable All Reminders" : "Stop All Reminders"}
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={handleClone}
                                        >
                                            Clone
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={handleMergeCustomers}
                                        >
                                            Merge Customers
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={async () => {
                                                setIsMoreDropdownOpen(false);
                                                const isCurrentlyActive = isCustomerActive(customer);
                                                await setActiveStatus(!isCurrentlyActive);
                                                setShowActionHeader(true);
                                            }}
                                        >
                                            {isCustomerActive(customer) ? "Mark as Inactive" : "Mark as Active"}
                                        </button>
                                        <div className="my-1 h-px bg-gray-200" />
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                                            onClick={() => {
                                                setIsMoreDropdownOpen(false);
                                                setIsDeleteModalOpen(true);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => navigate("/sales/customers")}
                                className="h-[38px] flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 border-b-[4px] text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-6 mb-0 border-b border-gray-200 bg-white px-1">
                    <button
                        type="button"
                        className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "overview"
                            ? "text-gray-900 border-[#156372]"
                            : "text-gray-500 hover:text-gray-900 border-transparent"
                            }`}
                        style={{ outline: "none", boxShadow: "none" }}
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "comments"
                            ? "text-gray-900 border-[#156372]"
                            : "text-gray-500 hover:text-gray-900 border-transparent"
                            }`}
                        style={{ outline: "none", boxShadow: "none" }}
                        onClick={() => setActiveTab("comments")}
                    >
                        Comments
                    </button>
                    <button
                        type="button"
                        className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "transactions"
                            ? "text-gray-900 border-[#156372]"
                            : "text-gray-500 hover:text-gray-900 border-transparent"
                            }`}
                        style={{ outline: "none", boxShadow: "none" }}
                        onClick={() => {
                            setActiveTab("transactions");
                            if (!selectedTransactionType) {
                                openTransactionSection("invoices");
                            }
                        }}
                    >
                        Transactions
                    </button>
                        {customer?.linkedVendorId && (
                            <button
                            type="button"
                            className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "purchases"
                                ? "text-gray-900 border-[#156372]"
                                : "text-gray-500 hover:text-gray-900 border-transparent"
                                }`}
                            style={{ outline: "none", boxShadow: "none" }}
                            onClick={() => setActiveTab("purchases")}
                        >
                            Purchases
                        </button>
                    )}
                    <button
                        type="button"
                        className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "mails"
                            ? "text-gray-900 border-[#156372]"
                            : "text-gray-500 hover:text-gray-900 border-transparent"
                            }`}
                        style={{ outline: "none", boxShadow: "none" }}
                        onClick={() => setActiveTab("mails")}
                    >
                        Mails
                    </button>
                    <button
                        type="button"
                        className={`-mb-px px-2.5 py-3 text-[13px] font-bold cursor-pointer transition-colors border-b-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${activeTab === "statement"
                            ? "text-gray-900 border-[#156372]"
                            : "text-gray-500 hover:text-gray-900 border-transparent"
                            }`}
                        style={{ outline: "none", boxShadow: "none" }}
                        onClick={() => setActiveTab("statement")}
                    >
                        Statement
                    </button>
                </div>
                </div>
                </div>

                {/* Tab Content */}
        </>
    );
}
