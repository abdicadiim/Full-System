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

export default function CustomerDetailOutlookModal({ detail }: { detail: any }) {
    const {
        attachments,
        isOutlookIntegrationModalOpen,
        setIsOutlookIntegrationModalOpen,
    } = detail as any;
    return (
        <>
            {/* Outlook Integration Modal */}
            {
                isOutlookIntegrationModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Outlook Integration</h2>
                                <button
                                    className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white hover:bg-blue-700 cursor-pointer"
                                    onClick={() => setIsOutlookIntegrationModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Outlook Logo */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        {/* Outlook Logo - Blue envelope with O and grid pattern */}
                                        <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700"></div>
                                            {/* Grid pattern background - representing other Office apps */}
                                            <div className="absolute inset-0 opacity-30">
                                                <div className="grid grid-cols-3 gap-0.5 p-1.5">
                                                    {[...Array(9)].map((_, i) => (
                                                        <div key={i} className="bg-white/40 rounded-sm h-2"></div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* White O letter */}
                                            <div className="relative z-10 text-white text-4xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>O</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Heading */}
                                <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">
                                    Connect your Outlook account
                                </h3>

                                {/* Benefits List */}
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700">
                                            Associate emails to transactions for reference.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700">
                                            Include mail attachments into transactions.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700">
                                            Add email conversations to a transaction's activity history.
                                        </span>
                                    </li>
                                </ul>

                                {/* Learn More Link */}
                                <div className="mb-6">
                                    <a
                                        href="#"
                                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        Learn more about Outlook integration
                                    </a>
                                </div>

                                {/* Agreement Statement */}
                                <div className="mb-6 text-sm text-gray-600">
                                    I agree to the provider's{" "}
                                    <a
                                        href="#"
                                        className="text-blue-600 hover:text-blue-700 hover:underline"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        terms of use
                                    </a>{" "}
                                    and{" "}
                                    <a
                                        href="#"
                                        className="text-blue-600 hover:text-blue-700 hover:underline"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        privacy policy
                                    </a>{" "}
                                    and understand that the rights to use this product do not come from Zoho.
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            // Handle Outlook integration enable
                                            setIsOutlookIntegrationModalOpen(false);
                                            // Add your integration logic here
                                            toast.success("Outlook integration enabled!");
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 cursor-pointer transition-colors"
                                    >
                                        Enable Integration
                                    </button>
                                    <button
                                        onClick={() => setIsOutlookIntegrationModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
