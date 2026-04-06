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

export default function CustomerDetailDeleteModals({ detail }: { detail: any }) {
    const {
        customer,
        customers,
        deleteContactPerson,
        isDeleteContactPersonModalOpen,
        isDeleteModalOpen,
        navigate,
        pendingDeleteContactPersonIndex,
        setIsDeleteContactPersonModalOpen,
        setIsDeleteModalOpen,
        setPendingDeleteContactPersonIndex,
    } = detail as any;
    return (
        <>
            {/* Delete Customer Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
                        <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
                            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                                    !
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                                    Delete customer?
                                </h3>
                                <button
                                    type="button"
                                    className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="px-5 py-3 text-[13px] text-slate-600">
                                You cannot retrieve this customer once they have been deleted.
                            </div>
                            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                                <button
                                    type="button"
                                    className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                                    onClick={async () => {
                                        try {
                                            const customerId = String(customer?._id || customer?.id || "").trim();
                                            if (!customerId) {
                                                throw new Error("Missing customer id");
                                            }
                                            await customersAPI.delete(customerId);
                                            setIsDeleteModalOpen(false);
                                            navigate("/sales/customers");
                                            toast.success("Customer deleted successfully");
                                        } catch (error) {
                                            toast.error("Failed to delete customer: " + ((error as any)?.message || "Unknown error"));
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Delete Contact Person Confirmation Modal */}
            {
                isDeleteContactPersonModalOpen && (
                    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
                        <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
                            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                                    !
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                                    Do you want to delete the contact person?
                                </h3>
                                <button
                                    type="button"
                                    className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    onClick={() => setIsDeleteContactPersonModalOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                                <button
                                    type="button"
                                    className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                                    onClick={async () => {
                                        if (pendingDeleteContactPersonIndex === null) return;
                                        await deleteContactPerson(pendingDeleteContactPersonIndex);
                                        setIsDeleteContactPersonModalOpen(false);
                                        setPendingDeleteContactPersonIndex(null);
                                    }}
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                                    onClick={() => {
                                        setIsDeleteContactPersonModalOpen(false);
                                        setPendingDeleteContactPersonIndex(null);
                                    }}
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
