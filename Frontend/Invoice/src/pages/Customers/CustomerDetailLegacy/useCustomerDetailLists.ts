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

export function useCustomerDetailLists(detail: any) {
    const {
        billStatusFilter,
        bills,
        commentText,
        comments,
        creditNoteStatusFilter,
        creditNotes,
        customer,
        expenseStatusFilter,
        expenses,
        invoiceCurrentPage,
        invoiceSearchTerm,
        invoiceStatusFilter,
        invoices,
        invoicesPerPage,
        projectStatusFilter,
        projects,
        quoteStatusFilter,
        quotes,
        recurringExpenseStatusFilter,
        recurringExpenses,
        recurringInvoiceStatusFilter,
        recurringInvoices,
        refreshData,
        salesReceiptStatusFilter,
        salesReceipts,
        setCommentText,
        setComments,
        setCustomer,
        setCustomers,
    } = detail as any;
    const params = useParams();
    const routeCustomerId = String(params.id ?? "").trim();
    const safeArray = (value: any) => (Array.isArray(value) ? value : []);
    // Filter and paginate invoices
    const getFilteredInvoices = () => {
        let filtered = safeArray(invoices);

        // Apply search filter
        if (invoiceSearchTerm) {
            const searchLower = invoiceSearchTerm.toLowerCase();
            filtered = filtered.filter((inv: any) =>
                (inv.invoiceNumber || "").toLowerCase().includes(searchLower) ||
                (inv.orderNumber || "").toLowerCase().includes(searchLower) ||
                (inv.id || "").toLowerCase().includes(searchLower)
            );
        }

        // Apply status filter
        if (invoiceStatusFilter !== "all") {
            filtered = filtered.filter((inv: any) =>
                normalizeInvoiceStatus(inv) === invoiceStatusFilter.toLowerCase()
            );
        }

        return filtered;
    };

    const filteredInvoices = getFilteredInvoices();
    const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
    const startIndex = (invoiceCurrentPage - 1) * invoicesPerPage;
    const endIndex = startIndex + invoicesPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    const getFilteredQuotes = () => {
        let filtered = safeArray(quotes);
        if (quoteStatusFilter !== "all") {
            filtered = filtered.filter((q: any) => (q.status || "draft").toLowerCase() === quoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringInvoices = () => {
        let filtered = safeArray(recurringInvoices);
        if (recurringInvoiceStatusFilter !== "all") {
            filtered = filtered.filter((ri: any) => (ri.status || "active").toLowerCase() === recurringInvoiceStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredExpenses = () => {
        let filtered = safeArray(expenses);
        if (expenseStatusFilter !== "all") {
            filtered = filtered.filter((e: any) => (e.status || "unbilled").toLowerCase() === expenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringExpenses = () => {
        let filtered = safeArray(recurringExpenses);
        if (recurringExpenseStatusFilter !== "all") {
            filtered = filtered.filter((re: any) => (re.status || "active").toLowerCase() === recurringExpenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredProjects = () => {
        let filtered = safeArray(projects);
        if (projectStatusFilter !== "all") {
            filtered = filtered.filter((p: any) => (p.status || "active").toLowerCase() === projectStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredBills = () => {
        let filtered = safeArray(bills);
        if (billStatusFilter !== "all") {
            filtered = filtered.filter((b: any) => (b.status || "draft").toLowerCase() === billStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredCreditNotes = () => {
        let filtered = safeArray(creditNotes);
        if (creditNoteStatusFilter !== "all") {
            filtered = filtered.filter((cn: any) => (cn.status || "draft").toLowerCase() === creditNoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredSalesReceipts = () => {
        let filtered = safeArray(salesReceipts);
        if (salesReceiptStatusFilter !== "all") {
            filtered = filtered.filter((sr: any) => (sr.status || "draft").toLowerCase() === salesReceiptStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const handleAddComment = async () => {
        const trimmedComment = commentText.trim();
        if (!trimmedComment) return;

        const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
        if (!customerId) {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const previousComments = comments;
        const newComment: Comment = {
            id: Date.now(),
            text: trimmedComment,
            timestamp: new Date().toISOString(),
            author: "You"
        };
        const updatedComments = [...previousComments, newComment];

        setComments(updatedComments);
        setCommentText("");

        try {
            const response = await customersAPI.update(customerId, { comments: updatedComments });
            const savedComments = normalizeComments(response?.data?.comments ?? updatedComments);
            setComments(savedComments);
            setCustomer((prev: any) => (prev ? { ...prev, comments: savedComments } : prev));
        } catch (error: any) {
            setComments(previousComments);
            setCommentText(trimmedComment);
            toast.error("Failed to save comment: " + (error?.message || "Unknown error"));
        }
    };

    const handleDeleteComment = async (commentId: string | number) => {
        const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
        if (!customerId) {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const previousComments = comments;
        const updatedComments = previousComments.filter((comment: any) => String(comment.id) !== String(commentId));
        setComments(updatedComments);

        try {
            const response = await customersAPI.update(customerId, { comments: updatedComments });
            const savedComments = normalizeComments(response?.data?.comments ?? updatedComments);
            setComments(savedComments);
            setCustomer((prev: any) => (prev ? { ...prev, comments: savedComments } : prev));
        } catch (error: any) {
            setComments(previousComments);
            toast.error("Failed to delete comment: " + (error?.message || "Unknown error"));
        }
    };

    const applyFormatting = (format: string) => {
        // Simple text formatting implementation
        const textarea = document.getElementById("comment-textarea") as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = commentText.substring(start, end);
            let formattedText = "";

            if (format === "bold") {
                formattedText = `**${selectedText}**`;
            } else if (format === "italic") {
                formattedText = `*${selectedText}*`;
            } else if (format === "underline") {
                formattedText = `__${selectedText}__`;
            }

            const newText = commentText.substring(0, start) + formattedText + commentText.substring(end);
            setCommentText(newText);

            // Reset cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
            }, 0);
        }
    };

    const isCustomerActive = (c: any) => {
        const status = String(c?.status ?? "").toLowerCase().trim();
        if (status === "inactive" || c?.isInactive === true) return false;
        return status === "active" || c?.isActive === true || (!status && c?.isInactive !== true);
    };

    const setActiveStatus = async (makeActive: boolean) => {
        const targetId = String((customer as any)?._id || (customer as any)?.id || routeCustomerId || "").trim();
        if (!targetId || targetId.toLowerCase() === "undefined" || targetId.toLowerCase() === "null") {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const status = makeActive ? "active" : "inactive";
        const statusLabel = makeActive ? "active" : "inactive";

        // Optimistic UI update for current customer and exact matching sidebar row only.
        setCustomer((prev: any) => prev ? ({ ...prev, status, isActive: makeActive, isInactive: !makeActive }) : prev);
        setCustomers((prev: any) => prev.map((c: any) => {
            const rowId = String(c?._id || c?.id || "").trim();
            if (!rowId || rowId.toLowerCase() === "undefined" || rowId.toLowerCase() === "null") return c;
            return rowId === targetId
                ? ({ ...c, status, isActive: makeActive, isInactive: !makeActive })
                : c;
        }));

        try {
            if (makeActive) {
                await customersAPI.markActive(targetId);
            } else {
                await customersAPI.markInactive(targetId);
            }
            toast.success(`Customer marked as ${statusLabel} successfully`);

            // Pull canonical state from backend to avoid any accidental UI bleed.
            await refreshData();
        } catch (error: any) {
            toast.error("Failed to update customer: " + (error.message || "Unknown error"));
            // Best-effort refresh to revert any mismatch
            await refreshData();
        }
    };
    Object.assign(detail, {
        applyFormatting,
        endIndex,
        filteredInvoices,
        formatCurrency,
        getFilteredBills,
        getFilteredCreditNotes,
        getFilteredExpenses,
        getFilteredInvoices,
        getFilteredProjects,
        getFilteredQuotes,
        getFilteredRecurringExpenses,
        getFilteredRecurringInvoices,
        getFilteredSalesReceipts,
        handleAddComment,
        handleDeleteComment,
        isCustomerActive,
        normalizeComments,
        paginatedInvoices,
        setActiveStatus,
        startIndex,
        totalPages,
    });
    return detail;
}
