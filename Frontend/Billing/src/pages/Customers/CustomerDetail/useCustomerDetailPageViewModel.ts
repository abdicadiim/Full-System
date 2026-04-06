import { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, documentsAPI } from "../../../services/api";
import type {
  CustomerDetailMail as Mail,
  CustomerPdfTemplates,
} from "./customerDetailTypes";

const normalizeCustomerText = (value: any) => String(value ?? "").trim();
const isMongoObjectId = (value: any) => /^[a-f0-9]{24}$/i.test(normalizeCustomerText(value));

const getCustomerIdCandidates = (customer: any, routeId?: any) => {
    const seen = new Set<string>();

    return [customer?._id, customer?.id, routeId]
        .map(normalizeCustomerText)
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        });
};

const buildCustomerStatusPatch = (makeActive: boolean, persistedCustomer?: any) => {
    const normalizedStatus = normalizeCustomerText(persistedCustomer?.status).toLowerCase();
    const status = normalizedStatus || (makeActive ? "active" : "inactive");
    const resolvedIsActive =
        typeof persistedCustomer?.isActive === "boolean"
            ? persistedCustomer.isActive
            : status !== "inactive";
    const resolvedIsInactive =
        typeof persistedCustomer?.isInactive === "boolean"
            ? persistedCustomer.isInactive
            : !resolvedIsActive;

    return {
        ...(persistedCustomer && typeof persistedCustomer === "object" ? persistedCustomer : {}),
        status,
        isActive: resolvedIsActive,
        isInactive: resolvedIsInactive,
    };
};

const buildUniqueCloneLabel = (baseValue: any, existingValues: any[]) => {
    const base = normalizeCustomerText(baseValue) || "Customer";
    const existing = new Set(
        (Array.isArray(existingValues) ? existingValues : [])
            .map((value: any) => normalizeCustomerText(value).toLowerCase())
            .filter(Boolean)
    );

    const defaultCandidate = `${base} (Clone)`;
    if (!existing.has(defaultCandidate.toLowerCase())) {
        return defaultCandidate;
    }

    let index = 2;
    let candidate = `${base} (Clone ${index})`;
    while (existing.has(candidate.toLowerCase())) {
        index += 1;
        candidate = `${base} (Clone ${index})`;
    }

    return candidate;
};

export function useCustomerDetailPageViewModel(args: any) {
    const {
        id,
        customer,
        customers,
        navigate,
        activeTab,
        invoices,
        payments,
        creditNotes,
        quotes,
        recurringInvoices,
        expenses,
        recurringExpenses,
        projects,
        salesReceipts,
        expandedSections,
        setExpandedSections,
        expandedTransactions,
        setExpandedTransactions,
        selectedCustomers,
        setSelectedCustomers,
        statusDropdownRef,
        isStatusDropdownOpen,
        setIsStatusDropdownOpen,
        linkEmailDropdownRef,
        isLinkEmailDropdownOpen,
        setIsLinkEmailDropdownOpen,
        statementPeriodDropdownRef,
        isStatementPeriodDropdownOpen,
        setIsStatementPeriodDropdownOpen,
        statementFilterDropdownRef,
        isStatementFilterDropdownOpen,
        setIsStatementFilterDropdownOpen,
        bulkActionsDropdownRef,
        isBulkActionsDropdownOpen,
        setIsBulkActionsDropdownOpen,
        startDatePickerRef,
        isStartDatePickerOpen,
        setIsStartDatePickerOpen,
        endDatePickerRef,
        isEndDatePickerOpen,
        setIsEndDatePickerOpen,
        mergeCustomerDropdownRef,
        isMergeCustomerDropdownOpen,
        setIsMergeCustomerDropdownOpen,
        newTransactionDropdownRef,
        isNewTransactionDropdownOpen,
        setIsNewTransactionDropdownOpen,
        goToTransactionsDropdownRef,
        isGoToTransactionsDropdownOpen,
        setIsGoToTransactionsDropdownOpen,
        attachmentsDropdownRef,
        isAttachmentsDropdownOpen,
        setIsAttachmentsDropdownOpen,
        moreDropdownRef,
        isMoreDropdownOpen,
        setIsMoreDropdownOpen,
        settingsDropdownRef,
        isSettingsDropdownOpen,
        setIsSettingsDropdownOpen,
        vendorDropdownRef,
        isVendorDropdownOpen,
        setIsVendorDropdownOpen,
        sidebarMoreMenuRef,
        isSidebarMoreMenuOpen,
        setIsSidebarMoreMenuOpen,
        quoteStatusDropdownRef,
        isQuoteStatusDropdownOpen,
        setIsQuoteStatusDropdownOpen,
        recurringInvoiceStatusDropdownRef,
        isRecurringInvoiceStatusDropdownOpen,
        setIsRecurringInvoiceStatusDropdownOpen,
        expenseStatusDropdownRef,
        isExpenseStatusDropdownOpen,
        setIsExpenseStatusDropdownOpen,
        recurringExpenseStatusDropdownRef,
        isRecurringExpenseStatusDropdownOpen,
        setIsRecurringExpenseStatusDropdownOpen,
        projectStatusDropdownRef,
        isProjectStatusDropdownOpen,
        setIsProjectStatusDropdownOpen,
        creditNoteStatusDropdownRef,
        isCreditNoteStatusDropdownOpen,
        setIsCreditNoteStatusDropdownOpen,
        salesReceiptStatusDropdownRef,
        isSalesReceiptStatusDropdownOpen,
        setIsSalesReceiptStatusDropdownOpen,
        subscriptionDropdownRef,
        isSubscriptionDropdownOpen,
        setIsSubscriptionDropdownOpen,
        setSelectedTransactionType,
        linkedVendorPurchaseSections,
        setLinkedVendorPurchaseSections,
        setIsPrintStatementsModalOpen,
        statementPeriod,
        setStatementPeriod,
        statementFilter,
        setStatementFilter,
        isStatementDownloading,
        setIsStatementDownloading,
        organizationProfile,
        ownerEmail,
        setMergeTargetCustomer,
        mergeTargetCustomer,
        setMergeCustomerSearch,
        mergeCustomerSearch,
        setIsMergeModalOpen,
        setIsAssociateTemplatesModalOpen,
        pdfTemplates,
        setPdfTemplates,
        inviteEmail,
        setInviteEmail,
        setInviteMethod,
        setIsInviteModalOpen,
        setIsSendingInvitation,
        setShowInviteCard,
        mapDocumentsToAttachments,
        setCustomer,
        setCustomers,
        setAttachments,
        fileInputRef,
        setIsUploadingAttachments,
        cloneContactType,
        setCloneContactType,
        setIsCloneModalOpen,
        setIsCloning,
        invoiceStatusFilter,
        setInvoiceStatusFilter,
        invoiceCurrentPage,
        setInvoiceCurrentPage,
        invoicesPerPage,
        quoteStatusFilter,
        setQuoteStatusFilter,
        recurringInvoiceStatusFilter,
        setRecurringInvoiceStatusFilter,
        expenseStatusFilter,
        setExpenseStatusFilter,
        recurringExpenseStatusFilter,
        setRecurringExpenseStatusFilter,
        projectStatusFilter,
        setProjectStatusFilter,
        creditNoteStatusFilter,
        setCreditNoteStatusFilter,
        salesReceiptStatusFilter,
        setSalesReceiptStatusFilter,
        setMails,
        areRemindersStopped,
        setAreRemindersStopped,
        refreshData,
        reloadSidebarCustomerList,
    } = args;

    const organizationName = String(
        organizationProfile?.organizationName ||
        organizationProfile?.name ||
        "Organization"
    ).trim() || "Organization";
    const displayName =
        customer?.displayName ||
        customer?.name ||
        `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
        customer?.companyName ||
        "";
    // Close dropdowns when clicking outside
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
            if (linkEmailDropdownRef.current && !linkEmailDropdownRef.current.contains(event.target as Node)) {
                setIsLinkEmailDropdownOpen(false);
            }
            if (statementPeriodDropdownRef.current && !statementPeriodDropdownRef.current.contains(event.target as Node)) {
                setIsStatementPeriodDropdownOpen(false);
            }
            if (statementFilterDropdownRef.current && !statementFilterDropdownRef.current.contains(event.target as Node)) {
                setIsStatementFilterDropdownOpen(false);
            }
            if (bulkActionsDropdownRef.current && !bulkActionsDropdownRef.current.contains(event.target as Node)) {
                setIsBulkActionsDropdownOpen(false);
            }
            if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) {
                setIsStartDatePickerOpen(false);
            }
            if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) {
                setIsEndDatePickerOpen(false);
            }
            if (mergeCustomerDropdownRef.current && !mergeCustomerDropdownRef.current.contains(event.target as Node)) {
                setIsMergeCustomerDropdownOpen(false);
            }
            if (newTransactionDropdownRef.current && !newTransactionDropdownRef.current.contains(event.target as Node)) {
                setIsNewTransactionDropdownOpen(false);
            }
            if (goToTransactionsDropdownRef.current && !goToTransactionsDropdownRef.current.contains(event.target as Node)) {
                setIsGoToTransactionsDropdownOpen(false);
            }
            if (attachmentsDropdownRef.current && !attachmentsDropdownRef.current.contains(event.target as Node)) {
                setIsAttachmentsDropdownOpen(false);
            }
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
                setIsMoreDropdownOpen(false);
            }
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
                setIsSettingsDropdownOpen(false);
            }
            if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
                setIsVendorDropdownOpen(false);
            }
            if (sidebarMoreMenuRef.current && !sidebarMoreMenuRef.current.contains(event.target as Node)) {
                setIsSidebarMoreMenuOpen(false);
            }
            if (quoteStatusDropdownRef.current && !quoteStatusDropdownRef.current.contains(event.target as Node)) {
                setIsQuoteStatusDropdownOpen(false);
            }
            if (recurringInvoiceStatusDropdownRef.current && !recurringInvoiceStatusDropdownRef.current.contains(event.target as Node)) {
                setIsRecurringInvoiceStatusDropdownOpen(false);
            }
            if (expenseStatusDropdownRef.current && !expenseStatusDropdownRef.current.contains(event.target as Node)) {
                setIsExpenseStatusDropdownOpen(false);
            }
            if (recurringExpenseStatusDropdownRef.current && !recurringExpenseStatusDropdownRef.current.contains(event.target as Node)) {
                setIsRecurringExpenseStatusDropdownOpen(false);
            }
            if (projectStatusDropdownRef.current && !projectStatusDropdownRef.current.contains(event.target as Node)) {
                setIsProjectStatusDropdownOpen(false);
            }
            if (creditNoteStatusDropdownRef.current && !creditNoteStatusDropdownRef.current.contains(event.target as Node)) {
                setIsCreditNoteStatusDropdownOpen(false);
            }
            if (salesReceiptStatusDropdownRef.current && !salesReceiptStatusDropdownRef.current.contains(event.target as Node)) {
                setIsSalesReceiptStatusDropdownOpen(false);
            }
            if (subscriptionDropdownRef.current && !subscriptionDropdownRef.current.contains(event.target as Node)) {
                setIsSubscriptionDropdownOpen(false);
            }
        };
        if (isStatusDropdownOpen || isLinkEmailDropdownOpen || isStatementPeriodDropdownOpen || isStatementFilterDropdownOpen || isBulkActionsDropdownOpen || isStartDatePickerOpen || isEndDatePickerOpen || isMergeCustomerDropdownOpen || isNewTransactionDropdownOpen || isGoToTransactionsDropdownOpen || isAttachmentsDropdownOpen || isMoreDropdownOpen || isVendorDropdownOpen || isSettingsDropdownOpen || isSidebarMoreMenuOpen ||
            isQuoteStatusDropdownOpen || isRecurringInvoiceStatusDropdownOpen || isExpenseStatusDropdownOpen || isRecurringExpenseStatusDropdownOpen || isProjectStatusDropdownOpen || isCreditNoteStatusDropdownOpen || isSalesReceiptStatusDropdownOpen || isSubscriptionDropdownOpen) {
            document.addEventListener("pointerdown", handleClickOutside);
        } else {
            document.removeEventListener("pointerdown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [isStatusDropdownOpen, isLinkEmailDropdownOpen, isStatementPeriodDropdownOpen, isStatementFilterDropdownOpen, isBulkActionsDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, isMergeCustomerDropdownOpen, isNewTransactionDropdownOpen, isGoToTransactionsDropdownOpen, isAttachmentsDropdownOpen, isMoreDropdownOpen, isVendorDropdownOpen, isSettingsDropdownOpen, isSidebarMoreMenuOpen,
        isQuoteStatusDropdownOpen, isRecurringInvoiceStatusDropdownOpen, isExpenseStatusDropdownOpen, isRecurringExpenseStatusDropdownOpen, isProjectStatusDropdownOpen, isCreditNoteStatusDropdownOpen, isSalesReceiptStatusDropdownOpen, isSubscriptionDropdownOpen]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const openTransactionSection = (section: keyof typeof expandedTransactions) => {
        setExpandedTransactions(prev => {
            const next = { ...prev };
            (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
                next[key] = false;
            });
            next[section] = true;
            return next;
        });
        setSelectedTransactionType(section);
        setIsGoToTransactionsDropdownOpen(false);
    };

    const toggleTransactionSection = (section: keyof typeof expandedTransactions) => {
        setExpandedTransactions(prev => {
            const isOpen = prev[section];
            const next = { ...prev };
            (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
                next[key] = false;
            });
            next[section] = !isOpen;
            return next;
        });
        setSelectedTransactionType(section);
    };

    const toggleLinkedVendorPurchaseSection = (section: keyof typeof linkedVendorPurchaseSections) => {
        setLinkedVendorPurchaseSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Customer selection handlers
    const handleCustomerCheckboxChange = (customerId: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation();
        setSelectedCustomers(prev => {
            if (prev.includes(customerId)) {
                return prev.filter(id => id !== customerId);
            } else {
                return [...prev, customerId];
            }
        });
    };

    const handleClearSelection = () => {
        setSelectedCustomers([]);
    };

    const handleSelectAllCustomers = () => {
        if (selectedCustomers.length === customers.length) {
            setSelectedCustomers([]);
        } else {
            setSelectedCustomers(customers.map((c: any) => c.id));
        }
    };

    const handlePrintCustomerStatements = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsPrintStatementsModalOpen(true);
    };

    const handlePrintStatementsSubmit = () => {
        // TODO: Implement actual print functionality
        setIsPrintStatementsModalOpen(false);
        toast.info(`Printing statements for ${selectedCustomers.length} customer(s)`);
    };

    const syncCurrentCustomerPatch = useCallback((patch: any, explicitId?: string) => {
        const targetId = String(explicitId || (customer as any)?._id || (customer as any)?.id || id || "").trim();
        if (!targetId) return;

        setCustomer((prev: any) => {
            if (!prev) return prev;
            const prevId = String(prev?._id || prev?.id || "").trim();
            if (prevId && prevId !== targetId) return prev;
            return { ...prev, ...patch };
        });

        setCustomers((prev: any[]) =>
            (Array.isArray(prev) ? prev : []).map((row: any) => {
                const rowId = String(row?._id || row?.id || "").trim();
                if (!rowId || rowId !== targetId) return row;
                return { ...row, ...patch };
            })
        );
    }, [customer, id, setCustomer, setCustomers]);

    const buildCustomerSystemMails = useCallback((customerRow: any) => {
        const customerId = String(id || customerRow?._id || customerRow?.id || "").trim();
        if (!customerId) return [];

        const emails = Array.from(new Set([
            String(customerRow?.email || "").trim(),
            ...(Array.isArray(customerRow?.contactPersons)
                ? customerRow.contactPersons.map((p: any) => String(p?.email || "").trim())
                : []),
        ].filter(Boolean))).filter(Boolean);

        const defaultTo = emails[0] || "";

        const rows: Array<Mail & { sortTime: number }> = [];

        // 1) Local mail log (created via customersAPI.sendInvitation/sendReviewRequest/sendStatement)
        try {
            const raw = localStorage.getItem("taban_customer_mail_log");
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            list
                .filter((entry: any) => String(entry?.customerId || "").trim() === customerId)
                .forEach((entry: any, idx: number) => {
                    const type = String(entry?.type || "system").trim();
                    const payload = entry?.payload || {};
                    const createdAt = entry?.createdAt || entry?.timestamp || entry?.date || "";
                    const to =
                        String(payload?.to || payload?.email || payload?.recipient || defaultTo || "").trim() ||
                        defaultTo ||
                        "";

                    const subjectAndDesc = (() => {
                        if (type === "send-invitation") {
                            return { subject: "Invite to Portal", description: "Sent" };
                        }
                        if (type === "request-review") {
                            return { subject: "Request Review", description: "Sent" };
                        }
                        if (type === "send-statement") {
                            return { subject: "Customer Statement", description: "Sent" };
                        }
                        return { subject: type.replace(/-/g, " "), description: "Sent" };
                    })();

                    rows.push({
                        id: String(entry?.id || `mail-log-${idx}`),
                        to,
                        subject: subjectAndDesc.subject,
                        description: subjectAndDesc.description,
                        date: formatMailDateTime(createdAt),
                        type,
                        initial: (to?.[0] || "M").toUpperCase(),
                        sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - idx,
                    });
                });
        } catch {
            // ignore local storage errors
        }

        // 2) Payments → Payment Acknowledgment
        const paymentTo = defaultTo;
        if (paymentTo && Array.isArray(payments) && payments.length) {
            payments.forEach((payment: any, idx: number) => {
                const createdAt = payment?.date || payment?.paymentDate || payment?.createdAt || payment?.created_on || "";
                const amount = Number(payment?.amount ?? payment?.total ?? payment?.amountPaid ?? 0) || 0;
                const currency = String(payment?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(payment?.id || payment?._id || `payment-mail-${idx}`),
                    to: paymentTo,
                    subject: "Payment Acknowledgment - Thank you, We have received your payment.",
                    description: amount ? `${formatCurrency(amount, currency)} - Sent` : "Sent",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "payment",
                    initial: (paymentTo?.[0] || "P").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 1000 - idx,
                });
            });
        }

        // 3) Unpaid/Overdue invoices → Payment Reminder
        const reminderTo = defaultTo;
        if (reminderTo && Array.isArray(invoices) && invoices.length) {
            invoices.forEach((inv: any, idx: number) => {
                const status = String(inv?.status || inv?.invoiceStatus || "").toLowerCase();
                if (!status.includes("overdue") && !status.includes("unpaid") && !status.includes("due")) return;
                const number = String(inv?.invoiceNumber || inv?.invoiceNo || inv?.invoice_number || inv?.number || "INV").trim();
                const createdAt = inv?.date || inv?.invoiceDate || inv?.createdAt || inv?.created_on || "";
                const total = Number(inv?.total ?? inv?.amount ?? inv?.balance ?? 0) || 0;
                const currency = String(inv?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(inv?.id || inv?._id || `invoice-reminder-${idx}`),
                    to: reminderTo,
                    subject: `Payment Reminder - Payment of ${formatCurrency(total, currency)} is outstanding for ${number}`,
                    description: "",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "reminder",
                    initial: (reminderTo?.[0] || "R").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 2000 - idx,
                });
            });
        }

        // Sort newest first and limit (keep UI fast)
        return rows
            .filter((m) => Boolean(String(m.to || "").trim()))
            .sort((a, b) => b.sortTime - a.sortTime)
            .slice(0, 50)
            .map(({ sortTime, ...mail }) => mail);
    }, [id, payments, invoices]);

    useEffect(() => {
        if (!customer || !id) return;
        // keep mails always in sync with selected customer + latest local logs
        setMails(buildCustomerSystemMails(customer));
    }, [customer, id, buildCustomerSystemMails, activeTab]);

    // Statement print, PDF, and Excel functions
    const getStatementDateRange = () => {
        const now = new Date();
        let startDate, endDate;

        switch (statementPeriod) {
            case "this-month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case "last-month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "this-quarter":
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case "this-year":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    };

    const handleDownloadPDF = async () => {
        if (!customer || isStatementDownloading) return;

        setIsStatementDownloading(true);

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const receivables = parseFloat(String(customer.receivables || customer.openingBalance || 0));
        const currency = customer.currency || "USD";

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        document.body.appendChild(container);

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            container.innerHTML = `
          <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">${organizationName}</h1>
                <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
                  <p style="margin: 2px 0;">${organizationProfile?.address?.country || "Aland Islands"}</p>
                  <p style="margin: 2px 0;">${ownerEmail?.email || organizationProfile?.email || ""}</p>
                </div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #2d3748; text-transform: uppercase; line-height: 1;">Statement</h2>
                <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${dateStr} - ${dateStr}
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #e2e8f0; margin-bottom: 40px;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
                <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${displayName || 'N/A'}</div>
                ${customer.companyName ? `<div style="font-size: 14px; color: #4a5568; margin-top: 4px;">${customer.companyName}</div>` : ''}
                <div style="font-size: 14px; color: #4a5568; margin-top: 2px;">${customer.email || ''}</div>
              </div>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; color: #2d3748; font-weight: 700; border-bottom: 2px solid #156372; display: inline-block; padding-bottom: 4px;">Account Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Opening Balance</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Invoiced Amount</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Amount Received</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #48bb78;">${currency} 0.00</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-weight: 800; color: #1a202c; font-size: 16px;">Balance Due</td>
                    <td style="text-align: right; padding: 12px 0 0 0; font-weight: 800; color: #156372; font-size: 18px;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="margin-bottom: 60px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #156372; color: white;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700; border-radius: 8px 0 0 8px;">DATE</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">TRANSACTIONS</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">DETAILS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">AMOUNT</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">PAYMENTS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700; border-radius: 0 8px 8px 0;">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600;">Opening Balance</td>
                    <td style="padding: 15px; color: #718096;">Initial balance</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; color: #48bb78;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">0.00</td>
                  </tr>
                  <tr style="background: #fcfcfc; border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600; color: #156372;">Invoice</td>
                    <td style="padding: 15px; color: #718096;">Account Balance Adjustment</td>
                    <td style="padding: 15px; text-align: right;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #156372;">
                    <td colspan="4" style="padding: 20px 15px; text-align: right; font-weight: 800; font-size: 14px; color: #2d3748;">NET BALANCE DUE</td>
                    <td style="padding: 20px 15px; text-align: right;"></td>
                    <td style="padding: 20px 15px; text-align: right; font-weight: 900; font-size: 15px; color: #156372;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 10px;">
              <p style="margin: 0; font-weight: 600;">Generated professionally by ${organizationName}</p>
              <p style="margin: 4px 0 0 0;">Report Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        `;

            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            pdf.save(`Statements_${today.toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            toast.error("Error generating PDF. Please try again.");
        } finally {
            try {
                document.body.removeChild(container);
            } catch (e) {
                // no-op
            }
            setIsStatementDownloading(false);
        }
    };

    const handleMergeCustomers = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setMergeTargetCustomer(null);
        setMergeCustomerSearch("");
        setIsMergeCustomerDropdownOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleMergeSubmit = async () => {
        if (!mergeTargetCustomer) {
            toast.error("Please select a customer to merge with.");
            return;
        }
        if (!customer) {
            toast.error("Customer data not available.");
            return;
        }

        const sourceCustomer = customer;
        const sourceCustomerId = String(sourceCustomer.id || sourceCustomer._id || "").trim();
        const targetCustomer = mergeTargetCustomer;
        const targetCustomerId = String(targetCustomer.id || targetCustomer._id || "").trim();

        if (!sourceCustomerId || !targetCustomerId) {
            toast.error("Unable to determine customer IDs for merge.");
            return;
        }

        if (sourceCustomerId === targetCustomerId) {
            toast.error("Please select a different customer to merge with.");
            return;
        }

        try {
            await customersAPI.merge(targetCustomerId, [sourceCustomerId]);

            toast.success(`Successfully merged "${sourceCustomer.name || sourceCustomer.displayName}" into "${targetCustomer.name || targetCustomer.displayName}".`);
            setIsMergeModalOpen(false);
            setMergeTargetCustomer(null);
            setMergeCustomerSearch("");

            navigate(`/sales/customers/${targetCustomerId}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to merge customers");
        }
    };

    // Get customers available for merge (exclude current customer)
    const getMergeableCustomers = () => {
        return customers.filter(c => {
            const candidateId = String(c.id || c._id || "");
            if (candidateId === String(id)) return false;
            return true;
        });
    };

    const filteredMergeCustomers = getMergeableCustomers().filter(c =>
        c.name.toLowerCase().includes(mergeCustomerSearch.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(mergeCustomerSearch.toLowerCase()))
    );

    const handleAssociateTemplates = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setIsAssociateTemplatesModalOpen(true);
    };

    const handleAssociateTemplatesSave = async () => {
        const targetId = String((customer as any)?._id || (customer as any)?.id || id || "").trim();
        if (!targetId) {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const patch = {
            pdfTemplates: { ...pdfTemplates }
        };

        setIsAssociateTemplatesModalOpen(false);
        syncCurrentCustomerPatch(patch, targetId);

        try {
            const response = await customersAPI.update(targetId, patch);
            if (!response?.success) {
                throw new Error(response?.message || "Failed to save associated templates");
            }

            const persistedTemplates = response?.data?.pdfTemplates || patch.pdfTemplates;
            syncCurrentCustomerPatch({ pdfTemplates: persistedTemplates }, targetId);
            toast.success("Templates associated successfully.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to save associated templates");
            void refreshData();
        }
    };

    const handleTemplateSelect = (category: "pdf", field: keyof CustomerPdfTemplates, value: string) => {
        if (category === "pdf") {
            setPdfTemplates(prev => ({ ...prev, [field]: value }));
        }
    };

    const getInviteEmailValue = () =>
        inviteEmail || customer?.email || customer?.contactPersons?.[0]?.email || "";

    const closeInviteModal = () => {
        setIsInviteModalOpen(false);
        setInviteEmail("");
        setInviteMethod("email");
        setIsSendingInvitation(false);
    };

    const getInviteCustomerName = () => customer?.name || customer?.displayName || "Customer";

    const handleInviteWhatsAppShare = () => {
        const inviteMessage = `Hello ${getInviteCustomerName()},\n\nYou have been invited to join our customer portal. Please click the link below to access your account:\n\n${window.location.href}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, "_blank");
        toast.success("Opening WhatsApp...");
    };

    const handleInviteFacebookShare = () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal`;
        const shareUrl = window.location.href;
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleInviteTwitterShare = () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal`;
        const shareUrl = window.location.href;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleInviteLinkedInShare = () => {
        const shareUrl = window.location.href;
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleCopyInvitationLink = async () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal: ${window.location.href}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Customer Portal Invitation",
                    text: shareText,
                });
                return;
            } catch {
                // Fall back to clipboard copy when native share is dismissed or unavailable.
            }
        }

        await navigator.clipboard.writeText(shareText);
        toast.success("Invitation link copied to clipboard!");
    };

    const handleSendInvitation = async () => {
        const emailToSend = getInviteEmailValue();
        if (!emailToSend || !emailToSend.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        const normalizedEmail = emailToSend.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsSendingInvitation(true);
        try {
            const response = await customersAPI.sendInvitation(id, {
                email: normalizedEmail,
                method: "email"
            });

            if (response && response.success) {
                toast.success(`Invitation email sent successfully to ${normalizedEmail}`);
                closeInviteModal();
                setShowInviteCard(true);
                return;
            }

            throw new Error(response?.message || "Failed to send invitation");
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
                error?.data?.error ||
                error?.message ||
                "Unknown error";

            toast.error(`Failed to send invitation: ${errorMessage}`, {
                autoClose: 5000
            });
        } finally {
            setIsSendingInvitation(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !customer || !id) return;

        setIsUploadingAttachments(true);
        try {
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const filesArray = Array.from(files);

            if (currentDocuments.length + filesArray.length > 10) {
                toast.error("You can upload a maximum of 10 files.");
                return;
            }

            const oversizedFiles = filesArray.filter((file) => file.size > 10 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                toast.error("Each file must be 10MB or less.");
                return;
            }

            const uploadedDocuments: any[] = [];
            let persistedDocuments: any[] | null = null;
            for (const file of filesArray) {
                const uploadResponse = await documentsAPI.upload(file, {
                    name: file.name,
                    module: "Customers",
                    type: "other",
                    relatedToType: "customer",
                    relatedToId: String(id)
                });

                if (uploadResponse?.success && uploadResponse?.data) {
                    const document = uploadResponse.data as any;
                    uploadedDocuments.push({
                        id: String(document.documentId || document.id || document._id || file.name),
                        documentId: String(document.documentId || document.id || document._id || "").trim() || String(document.id || document._id || ""),
                        name: document.name || file.name,
                        size: Number(document.size || file.size || 0),
                        mimeType: document.mimeType || file.type || "application/octet-stream",
                        url: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        viewUrl: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        downloadUrl: document.downloadUrl || document.url || document.contentUrl || "",
                        uploadedAt: document.uploadedAt || new Date().toISOString()
                    });
                    if (Array.isArray(document.documents)) {
                        persistedDocuments = document.documents;
                    }
                }
            }

            if (uploadedDocuments.length === 0) {
                toast.error("Failed to upload files. Please try again.");
                return;
            }

            const nextDocuments = Array.isArray(persistedDocuments) && persistedDocuments.length > 0
                ? persistedDocuments
                : [...currentDocuments, ...uploadedDocuments];

            setCustomer(prev => prev ? ({ ...prev, documents: nextDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(nextDocuments));

            toast.success(`${uploadedDocuments.length} file(s) uploaded successfully`);
        } catch (error) {
            toast.error('Failed to upload files: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsUploadingAttachments(false);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveAttachment = async (attachmentId: string | number) => {
        if (!customer || !id) return;

        try {
            const targetId = String(attachmentId || "").trim();
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const removedDocument = currentDocuments.find((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId === targetId || String(index + 1) === targetId;
            });
            const removedDocumentId = String(removedDocument?.documentId || removedDocument?.id || removedDocument?._id || targetId).trim();
            const updatedDocuments = currentDocuments.filter((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId !== targetId && String(index + 1) !== targetId;
            });

            if (!removedDocumentId) {
                throw new Error("Attachment not found.");
            }

            const deleteResponse = await documentsAPI.delete(String(removedDocumentId));
            const persistedDocuments = deleteResponse?.data?.documents || updatedDocuments;

            setCustomer(prev => prev ? ({ ...prev, documents: persistedDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(persistedDocuments));

            toast.success('Attachment removed successfully');
        } catch (error) {
            toast.error('Failed to remove attachment: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleClone = () => {
        setIsMoreDropdownOpen(false);
        setCloneContactType("customer");
        handleCloneSubmit("customer");
    };

    const handleCloneSubmit = async (forcedType?: "customer" | "vendor") => {
        if (!customer) return;

        // Keep existing vendor behavior; auto-clone customer directly.
        const contactType = forcedType || cloneContactType;
        if (contactType === "vendor") {
            const clonedData = {
                ...customer,
                id: undefined,
                name: `${customer.name} (Clone)`,
                displayName: customer.displayName ? `${customer.displayName} (Clone)` : undefined
            };
            setIsCloneModalOpen(false);
            navigate("/purchases/vendors/new", { state: { clonedData } });
            return;
        }

        setIsCloning(true);
        try {
            const source: any = customer;
            const sourceRows = [
                ...(Array.isArray(customers) ? customers : []),
                source,
            ];
            const existingNameValues = sourceRows.flatMap((row: any) => [
                row?.displayName,
                row?.name,
                row?.companyName,
            ]);
            const resolvedDisplayName = buildUniqueCloneLabel(source.displayName || source.name || "Customer", existingNameValues);
            const resolvedName = buildUniqueCloneLabel(source.name || source.displayName || "Customer", existingNameValues);

            const billingAddress = source.billingAddress || {
                attention: source.billingAttention || "",
                country: source.billingCountry || "",
                street1: source.billingStreet1 || "",
                street2: source.billingStreet2 || "",
                city: source.billingCity || "",
                state: source.billingState || "",
                zipCode: source.billingZipCode || "",
                phone: source.billingPhone || "",
                fax: source.billingFax || "",
            };

            const shippingAddress = source.shippingAddress || {
                attention: source.shippingAttention || "",
                country: source.shippingCountry || "",
                street1: source.shippingStreet1 || "",
                street2: source.shippingStreet2 || "",
                city: source.shippingCity || "",
                state: source.shippingState || "",
                zipCode: source.shippingZipCode || "",
                phone: source.shippingPhone || "",
                fax: source.shippingFax || "",
            };

            let clonedPayload = {
                displayName: resolvedDisplayName,
                name: resolvedName,
                status: "active",
                isActive: true,
                isInactive: false,
                customerType: source.customerType || "business",
                salutation: source.salutation || "",
                firstName: source.firstName || "",
                lastName: source.lastName || "",
                companyName: source.companyName || "",
                email: source.email || "",
                workPhone: source.workPhone || "",
                mobile: source.mobile || "",
                websiteUrl: source.websiteUrl || source.website || "",
                xHandle: source.xHandle || "",
                skypeName: source.skypeName || "",
                facebook: source.facebook || "",
                customerLanguage: source.customerLanguage || source.portalLanguage || "english",
                taxRate: source.taxRate || "",
                exchangeRate: parseFloat(String(source.exchangeRate || "1")) || 1,
                companyId: source.companyId || "",
                locationCode: source.locationCode || "",
                currency: source.currency || "USD",
                paymentTerms: source.paymentTerms || "due-on-receipt",
                department: source.department || "",
                designation: source.designation || "",
                accountsReceivable: source.accountsReceivable || "",
                openingBalance: String(source.openingBalance || source.receivables || "0"),
                receivables: parseFloat(String(source.receivables || source.openingBalance || "0")) || 0,
                enablePortal: !!source.enablePortal,
                customerOwner: source.customerOwner || "",
                remarks: source.remarks || source.notes || "",
                notes: source.notes || source.remarks || "",
                billingAddress,
                shippingAddress,
                contactPersons: Array.isArray(source.contactPersons)
                    ? source.contactPersons.map((cp: any) => {
                        const { id, _id, createdAt, updatedAt, ...rest } = cp || {};
                        return { ...rest };
                    })
                    : [],
                documents: Array.isArray(source.documents) ? [...source.documents] : [],
                customFields: source.customFields || {},
                reportingTags: source.reportingTags || []
            };

            const response: any = await customersAPI.create(clonedPayload);

            if (!response?.success) {
                throw new Error(response?.message || "Failed to clone customer");
            }

            const clonedCustomer = response?.data || {};
            const clonedCustomerId = normalizeCustomerText(clonedCustomer?.id || clonedCustomer?._id);
            const sidebarClone = {
                ...source,
                ...clonedCustomer,
                id: clonedCustomerId || clonedCustomer?.id || clonedCustomer?._id,
                _id: clonedCustomerId || clonedCustomer?._id || clonedCustomer?.id,
                name: clonedCustomer?.name || resolvedName,
                displayName: clonedCustomer?.displayName || resolvedDisplayName,
                customerNumber: clonedCustomer?.customerNumber || "",
                status: clonedCustomer?.status || "active",
                isActive: clonedCustomer?.isActive ?? true,
                isInactive: clonedCustomer?.isInactive ?? false,
            };
            const nextSidebarCustomers = [
                sidebarClone,
                ...(Array.isArray(customers) ? customers : []).filter((row: any) => {
                    const rowId = String(row?._id || row?.id || "").trim();
                    return !clonedCustomerId || rowId !== clonedCustomerId;
                }),
            ];

            window.dispatchEvent(new CustomEvent("customersUpdated", {
                detail: {
                    customer: sidebarClone,
                    action: "created"
                }
            }));

            setCustomers(nextSidebarCustomers);
            setIsCloneModalOpen(false);
            toast.success("Customer cloned successfully.");
            if (clonedCustomerId) {
                navigate(`/sales/customers/${clonedCustomerId}`, {
                    state: {
                        customer: sidebarClone,
                        customerList: nextSidebarCustomers,
                        customerJustSaved: true,
                    },
                });
            }
            void reloadSidebarCustomerList();
        } catch (error: any) {
            toast.error(error?.message || "Failed to clone customer");
        } finally {
            setIsCloning(false);
        }
    };

    const formatDateForDisplay = (date: any) => {
        if (!date) return "";
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatMailDateTime = (date: any) => {
        if (!date) return "";
        const dateObj = typeof date === "string" ? new Date(date) : date;
        if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
        const datePart = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const timePart = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
        return `${datePart} ${timePart}`;
    };

    const invoiceStatusOptions = ["all", "draft", "client viewed", "partially paid", "unpaid", "overdue", "paid", "void"];
    const formatStatusLabel = (value: string) => value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const normalizeInvoiceStatus = (invoice: any) => {
        const raw = String(invoice?.status || "draft").toLowerCase();
        if (raw === "void") return "void";
        if (raw === "paid") return "paid";
        if (raw === "overdue") return "overdue";
        if (raw === "partially paid" || raw === "partial" || raw === "partial paid") return "partially paid";
        if (raw === "open" || raw === "unpaid") return "unpaid";
        if (raw === "sent" || raw === "viewed" || invoice?.customerViewed) return "client viewed";
        return "draft";
    };

    // Filter and paginate invoices
    const getFilteredInvoices = () => {
        let filtered = invoices;
        if (invoiceStatusFilter !== "all") {
            filtered = filtered.filter(inv =>
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
        let filtered = quotes;
        if (quoteStatusFilter !== "all") {
            filtered = filtered.filter(q => (q.status || "draft").toLowerCase() === quoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringInvoices = () => {
        let filtered = recurringInvoices;
        if (recurringInvoiceStatusFilter !== "all") {
            filtered = filtered.filter(ri => (ri.status || "active").toLowerCase() === recurringInvoiceStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredExpenses = () => {
        let filtered = expenses;
        if (expenseStatusFilter !== "all") {
            filtered = filtered.filter(e => (e.status || "unbilled").toLowerCase() === expenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringExpenses = () => {
        let filtered = recurringExpenses;
        if (recurringExpenseStatusFilter !== "all") {
            filtered = filtered.filter(re => (re.status || "active").toLowerCase() === recurringExpenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredProjects = () => {
        let filtered = projects;
        if (projectStatusFilter !== "all") {
            filtered = filtered.filter(p => (p.status || "active").toLowerCase() === projectStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredCreditNotes = () => {
        let filtered = creditNotes;
        if (creditNoteStatusFilter !== "all") {
            filtered = filtered.filter(cn => (cn.status || "draft").toLowerCase() === creditNoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredSalesReceipts = () => {
        let filtered = salesReceipts;
        if (salesReceiptStatusFilter !== "all") {
            filtered = filtered.filter(sr => (sr.status || "draft").toLowerCase() === salesReceiptStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const formatCurrency = (amount: any, currency = "AMD") => {
        return `${currency}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;
    };

    const isCustomerActive = (c: any) => {
        const status = String(c?.status ?? "").toLowerCase().trim();
        if (status === "inactive" || c?.isInactive === true) return false;
        return status === "active" || c?.isActive === true || (!status && c?.isInactive !== true);
    };

    const setActiveStatus = async (makeActive: boolean) => {
        const customerIdCandidates = getCustomerIdCandidates(customer, id);
        const targetId = customerIdCandidates.find(isMongoObjectId) || customerIdCandidates[0] || "";
        if (!targetId || targetId.toLowerCase() === "undefined" || targetId.toLowerCase() === "null") {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const optimisticStatusPatch = buildCustomerStatusPatch(makeActive);
        const status = optimisticStatusPatch.status;
        const statusLabel = makeActive ? "active" : "inactive";

        customerIdCandidates.forEach((candidateId) => {
            syncCurrentCustomerPatch(optimisticStatusPatch, candidateId);
        });

        try {
            const response = await customersAPI.update(targetId, {
                status,
                isActive: optimisticStatusPatch.isActive,
                isInactive: optimisticStatusPatch.isInactive,
            });
            if (!response?.success) {
                throw new Error(response?.message || "Failed to update customer");
            }

            const persistedStatusPatch = buildCustomerStatusPatch(makeActive, response?.data);
            const persistedIdCandidates = getCustomerIdCandidates(response?.data, targetId);
            const patchTargets = Array.from(new Set([...customerIdCandidates, ...persistedIdCandidates]));

            patchTargets.forEach((candidateId) => {
                syncCurrentCustomerPatch(persistedStatusPatch, candidateId);
            });

            toast.success(`Customer marked as ${statusLabel} successfully`);
            void reloadSidebarCustomerList();
            void refreshData();
        } catch (error: any) {
            toast.error("Failed to update customer: " + (error.message || "Unknown error"));
            void refreshData();
        }
    };

    const handleToggleReminders = async () => {
        const targetId = String((customer as any)?._id || (customer as any)?.id || id || "").trim();
        if (!targetId || targetId.toLowerCase() === "undefined" || targetId.toLowerCase() === "null") {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const nextRemindersStopped = !Boolean(areRemindersStopped);
        const patch = {
            remindersStopped: nextRemindersStopped,
            remindersStoppedAt: new Date().toISOString(),
        };

        setIsMoreDropdownOpen(false);
        setAreRemindersStopped(nextRemindersStopped);
        syncCurrentCustomerPatch(patch, targetId);

        try {
            const response = await customersAPI.update(targetId, patch);
            if (!response?.success) {
                throw new Error(response?.message || "Failed to update reminders");
            }

            const persistedRemindersStopped = Boolean(response?.data?.remindersStopped ?? nextRemindersStopped);
            setAreRemindersStopped(persistedRemindersStopped);
            syncCurrentCustomerPatch({
                remindersStopped: persistedRemindersStopped,
                remindersStoppedAt: response?.data?.remindersStoppedAt || patch.remindersStoppedAt,
            }, targetId);
            toast.success(
                persistedRemindersStopped
                    ? "All reminders stopped for this customer."
                    : "All reminders enabled for this customer."
            );
        } catch (error: any) {
            setAreRemindersStopped(!nextRemindersStopped);
            toast.error(error?.message || "Failed to update reminders");
            void refreshData();
        }
    };

    const contactPersonsList = Array.isArray(customer?.contactPersons) ? customer.contactPersons : [];
    const primaryContactIndex = contactPersonsList.findIndex((p: any) => Boolean(p?.isPrimary));
    const primaryContact =
        primaryContactIndex >= 0
            ? contactPersonsList[primaryContactIndex]
            : contactPersonsList[0] || null;
    const resolvedPrimaryContactIndex =
        primaryContact
            ? (primaryContactIndex >= 0 ? primaryContactIndex : 0)
            : -1;
    const associatedTagLabels = (() => {
        const normalizeText = (value: any) =>
            String(value ?? "")
                .replace(/\\[nr]/g, " ")
                .replace(/[\r\n]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();
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

        const reportingTags = Array.isArray((customer as any)?.reportingTags)
            ? (customer as any).reportingTags
            : [];
        const legacyTags = Array.isArray((customer as any)?.tags)
            ? (customer as any).tags
            : [];

        const labels = [...reportingTags, ...legacyTags]
            .map((entry: any) => toLabel(entry))
            .filter((label: string) => Boolean(label));

        return Array.from(new Set(labels));
    })();

    const customerSubscriptions = (() => {
        const fromCustomer = Array.isArray((customer as any)?.subscriptions)
            ? (customer as any).subscriptions
            : [];
        if (fromCustomer.length) return fromCustomer;
        if (!customer) return [];
        try {
            const readList = (key: string) => {
                try {
                    const raw = localStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : [];
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const merged = [
                ...readList("taban_subscriptions_v1"),
                ...readList("taban_subscriptions"),
                ...readList("subscriptions"),
            ];
            if (!merged.length) return [];

            const unique = new Map<string, any>();
            merged.forEach((row: any, idx: number) => {
                const key = String(row?.id || row?._id || row?.subscriptionId || row?.subscriptionNumber || `row-${idx}`);
                if (!unique.has(key)) unique.set(key, row);
            });
            const parsed = Array.from(unique.values());

            const normalizeText = (value: any) => String(value ?? "").trim();
            const normalizeKey = (value: any) => normalizeText(value).toLowerCase();
            const getFirstValue = (...values: any[]) => values.find((v) => normalizeText(v));

            const customerIds = new Set(
                [
                    id,
                    (customer as any)?._id,
                    (customer as any)?.id,
                    (customer as any)?.customerId,
                    (customer as any)?.customer_id,
                    (customer as any)?.contactId,
                    (customer as any)?.contact_id,
                    (customer as any)?.booksCustomerId,
                    (customer as any)?.zohoCustomerId,
                ]
                    .map((v) => normalizeText(v))
                    .filter(Boolean)
            );
            if (!customerIds.size) return [];

            const customerName = normalizeKey(
                getFirstValue((customer as any)?.name, (customer as any)?.displayName, (customer as any)?.companyName, "")
            );
            const customerEmail = normalizeKey(
                getFirstValue(
                    (customer as any)?.email,
                    (customer as any)?.contactEmail,
                    (customer as any)?.contactPersons?.find?.((p: any) => p?.isPrimary)?.email,
                    ""
                )
            );

            return parsed.filter((sub: any) => {
                const subCustomerId = normalizeText(
                    getFirstValue(
                        sub?.customerId,
                        sub?.customer_id,
                        sub?.contactId,
                        sub?.contact_id,
                        sub?.customer?._id,
                        sub?.customer?.id,
                        typeof sub?.customer === "string" ? sub.customer : "",
                        ""
                    )
                );
                if (subCustomerId && customerIds.has(subCustomerId)) return true;

                const subEmail = normalizeKey(
                    getFirstValue(
                        sub?.customerEmail,
                        sub?.email,
                        sub?.customer?.email,
                        sub?.contactPersons?.[0]?.email,
                        ""
                    )
                );
                if (customerEmail && subEmail && subEmail === customerEmail) return true;

                const subName = normalizeKey(getFirstValue(sub?.customerName, sub?.customer?.name, sub?.customer?.displayName, ""));
                if (customerName && subName && subName === customerName) return true;

                return false;
            });
        } catch {
            return [];
        }
    })();
    return {
        displayName,
        primaryContact,
        resolvedPrimaryContactIndex,
        associatedTagLabels,
        customerSubscriptions,
        toggleSection,
        openTransactionSection,
        toggleTransactionSection,
        toggleLinkedVendorPurchaseSection,
        handleCustomerCheckboxChange,
        handleClearSelection,
        handleSelectAllCustomers,
        handlePrintCustomerStatements,
        handlePrintStatementsSubmit,
        getStatementDateRange,
        handleDownloadPDF,
        handleMergeCustomers,
        handleMergeSubmit,
        filteredMergeCustomers,
        handleAssociateTemplates,
        handleAssociateTemplatesSave,
        handleTemplateSelect,
        getInviteEmailValue,
        closeInviteModal,
        handleInviteWhatsAppShare,
        handleInviteFacebookShare,
        handleInviteTwitterShare,
        handleInviteLinkedInShare,
        handleCopyInvitationLink,
        handleSendInvitation,
        handleFileUpload,
        handleRemoveAttachment,
        handleClone,
        handleCloneSubmit,
        formatDateForDisplay,
        invoiceStatusOptions,
        formatStatusLabel,
        normalizeInvoiceStatus,
        filteredInvoices,
        startIndex,
        endIndex,
        paginatedInvoices,
        totalPages,
        getFilteredQuotes,
        getFilteredRecurringInvoices,
        getFilteredExpenses,
        getFilteredRecurringExpenses,
        getFilteredProjects,
        getFilteredCreditNotes,
        getFilteredSalesReceipts,
        formatCurrency,
        isCustomerActive,
        setActiveStatus,
        handleToggleReminders,
    };
}
