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

export function useCustomerDetailViewModel(detail: any) {
    const {
        customer,
        loading,
    } = detail as any;

    const safeCustomer = customer ?? {};
    const contactPersonsList = Array.isArray(safeCustomer.contactPersons) ? safeCustomer.contactPersons : [];
    const primaryContactIndex = contactPersonsList.findIndex((p: any) => Boolean(p?.isPrimary));
    const primaryContact =
        primaryContactIndex >= 0
            ? contactPersonsList[primaryContactIndex]
            : contactPersonsList[0] || null;
    const resolvedPrimaryContactIndex =
        primaryContact
            ? (primaryContactIndex >= 0 ? primaryContactIndex : 0)
            : -1;
    const displayName =
        safeCustomer.displayName ||
        safeCustomer.name ||
        `${safeCustomer.firstName || ""} ${safeCustomer.lastName || ""}`.trim() ||
        safeCustomer.companyName ||
        "";
    const associatedTagLabels = (() => {
        const normalizeText = (value: any) => String(value ?? "").trim();
        const toLabel = (entry: any) => {
            if (!entry) return "";
            if (typeof entry === "string") return normalizeText(entry);
            if (typeof entry !== "object") return "";

            const name = normalizeText(entry.name || entry.tagName || entry.label || entry.title);
            const value = normalizeText(
                entry.value ??
                entry.option ??
                entry.selectedValue ??
                entry.selected ??
                entry.tagValue
            );

            if (name && value) return `${name} ${value}`;
            return name || value;
        };

        const reportingTags = Array.isArray((safeCustomer as any)?.reportingTags)
            ? (safeCustomer as any).reportingTags
            : [];
        const legacyTags = Array.isArray((safeCustomer as any)?.tags)
            ? (safeCustomer as any).tags
            : [];

        const labels = [...reportingTags, ...legacyTags]
            .map((entry: any) => toLabel(entry))
            .filter((label: string) => Boolean(label));

        return Array.from(new Set(labels));
    })();

    const customerSubscriptions: any[] = [];

    Object.assign(detail, {
        associatedTagLabels,
        contactPersonsList,
        customerSubscriptions,
        displayName,
        primaryContact,
        primaryContactIndex,
        resolvedPrimaryContactIndex,
    });
    return detail;
}
