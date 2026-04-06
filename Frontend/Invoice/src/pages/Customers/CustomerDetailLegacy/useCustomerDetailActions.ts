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
import { buildStatementTransactions } from "./customerDetailStatementHelpers";

import type { ExtendedCustomer, Comment, Mail as CustomerMail } from "../CustomerDetail/CustomerDetail.shared";
import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";

export function useCustomerDetailActions(detail: any) {
    const {
        activeTab,
        associateTagsSeed,
        associateTagsValues,
        attachmentsDropdownRef,
        availableReportingTags,
        billStatusDropdownRef,
        bulkActionsDropdownRef,
        bulkConsolidatedAction,
        contactPersonMobilePhoneCode,
        contactPersonProfilePreview,
        contactPersonWorkPhoneCode,
        creditNoteStatusDropdownRef,
        creditNotes,
        customer,
        customers,
        id,
        editingContactPersonIndex,
        endDatePickerRef,
        expandedSections,
        expandedTransactions,
        expenseStatusDropdownRef,
        goToTransactionsDropdownRef,
        invoiceViewDropdownRef,
        invoices,
        isAssociateTagsModalOpen,
        isAttachmentsDropdownOpen,
        isBillStatusDropdownOpen,
        isBulkActionsDropdownOpen,
        isCreditNoteStatusDropdownOpen,
        isEndDatePickerOpen,
        isExpenseStatusDropdownOpen,
        isGoToTransactionsDropdownOpen,
        isInvoiceViewDropdownOpen,
        isLinkEmailDropdownOpen,
        isMergeCustomerDropdownOpen,
        isMoreDropdownOpen,
        isNewTransactionDropdownOpen,
        isProjectStatusDropdownOpen,
        isQuoteStatusDropdownOpen,
        isRecurringExpenseStatusDropdownOpen,
        isRecurringInvoiceStatusDropdownOpen,
        isSalesReceiptStatusDropdownOpen,
        isSettingsDropdownOpen,
        isSidebarMoreMenuOpen,
        isStartDatePickerOpen,
        isStatementFilterDropdownOpen,
        isStatementPeriodDropdownOpen,
        isStatusDropdownOpen,
        isSubscriptionDropdownOpen,
        isVendorDropdownOpen,
        linkEmailDropdownRef,
        linkedVendorPurchaseSections,
        mails,
        mergeCustomerDropdownRef,
        moreDropdownRef,
        navigate,
        newContactPerson,
        newTransactionDropdownRef,
        openContactPersonSettingsIndex,
        payments,
        profileImage,
        projectStatusDropdownRef,
        quoteStatusDropdownRef,
        recurringExpenseStatusDropdownRef,
        recurringInvoiceStatusDropdownRef,
        refreshData,
        salesReceiptStatusDropdownRef,
        selectedCustomers,
        setAssociateTagsSeed,
        setAssociateTagsValues,
        setAvailableReportingTags,
        setBulkConsolidatedAction,
        setContactPersonMobilePhoneCode,
        setContactPersonProfilePreview,
        setContactPersonWorkPhoneCode,
        setCustomer,
        setCustomers,
        setEditingContactPersonIndex,
        setExpandedSections,
        setExpandedTransactions,
        setIsAddContactPersonModalOpen,
        setIsAssociateTagsModalOpen,
        setIsAttachmentsDropdownOpen,
        setIsBillStatusDropdownOpen,
        setIsBulkActionsDropdownOpen,
        setIsBulkConsolidatedUpdating,
        setIsCreditNoteStatusDropdownOpen,
        setIsDeleteContactPersonModalOpen,
        setIsEndDatePickerOpen,
        setIsExpenseStatusDropdownOpen,
        setIsGoToTransactionsDropdownOpen,
        setIsInvoiceViewDropdownOpen,
        setIsLinkEmailDropdownOpen,
        setIsMergeCustomerDropdownOpen,
        setIsMoreDropdownOpen,
        setIsNewTransactionDropdownOpen,
        setIsPrintStatementsModalOpen,
        setIsProjectStatusDropdownOpen,
        setIsQuoteStatusDropdownOpen,
        setIsRecurringExpenseStatusDropdownOpen,
        setIsRecurringInvoiceStatusDropdownOpen,
        setIsSalesReceiptStatusDropdownOpen,
        setIsSavingAssociateTags,
        setIsSavingContactPerson,
        setIsSettingsDropdownOpen,
        setIsSidebarMoreMenuOpen,
        setIsStartDatePickerOpen,
        setIsStatementFilterDropdownOpen,
        setIsStatementPeriodDropdownOpen,
        setIsStatusDropdownOpen,
        setIsSubscriptionDropdownOpen,
        setIsVendorDropdownOpen,
        setLinkedVendor,
        setLinkedVendorPurchaseSections,
        setLinkedVendorPurchases,
        setMails,
        setNewContactPerson,
        setOpenContactPersonSettingsIndex,
        setPendingDeleteContactPersonIndex,
        setSelectedCustomers,
        setSelectedTransactionType,
        setStatementTransactions,
        settingsDropdownRef,
        sidebarMoreMenuRef,
        startDatePickerRef,
        statementFilterDropdownRef,
        statementPeriodDropdownRef,
        statusDropdownRef,
        subscriptionDropdownRef,
        vendorDropdownRef,
    } = detail as any;
    const safeCustomer = customer ?? {};
    useEffect(() => {
        setStatementTransactions(
            buildStatementTransactions({
                customer,
                invoices,
                payments,
                creditNotes,
            })
        );
    }, [customer, invoices, payments, creditNotes]);

    // Listen for customer update events
    // Listen for customer update events
    useEffect(() => {
        const handleCustomerUpdated = (event: any) => {
            // Reload customer data if the updated customer matches this one
            if (event.detail?.customer && id) {
                const updatedCustomerId = String(event.detail.customer._id || event.detail.customer.id);
                const currentCustomerId = String(id);
                if (updatedCustomerId === currentCustomerId) {
                    refreshData();
                    toast.success('Customer data refreshed');
                }
            }
        };

        window.addEventListener('customersUpdated', handleCustomerUpdated);

        return () => {
            window.removeEventListener('customersUpdated', handleCustomerUpdated);
        };
    }, [id]);

    // Reload when page becomes visible (user navigates back from edit)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && id) {
                refreshData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [id]);

    // Close dropdowns when clicking outside
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (invoiceViewDropdownRef.current && !invoiceViewDropdownRef.current.contains(event.target as Node)) {
                setIsInvoiceViewDropdownOpen(false);
            }
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
            if (billStatusDropdownRef.current && !billStatusDropdownRef.current.contains(event.target as Node)) {
                setIsBillStatusDropdownOpen(false);
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
        if (isInvoiceViewDropdownOpen || isStatusDropdownOpen || isLinkEmailDropdownOpen || isStatementPeriodDropdownOpen || isStatementFilterDropdownOpen || isBulkActionsDropdownOpen || isStartDatePickerOpen || isEndDatePickerOpen || isMergeCustomerDropdownOpen || isNewTransactionDropdownOpen || isGoToTransactionsDropdownOpen || isAttachmentsDropdownOpen || isMoreDropdownOpen || isVendorDropdownOpen || isSettingsDropdownOpen || isSidebarMoreMenuOpen ||
            isQuoteStatusDropdownOpen || isRecurringInvoiceStatusDropdownOpen || isExpenseStatusDropdownOpen || isRecurringExpenseStatusDropdownOpen || isProjectStatusDropdownOpen || isBillStatusDropdownOpen || isCreditNoteStatusDropdownOpen || isSalesReceiptStatusDropdownOpen || isSubscriptionDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isInvoiceViewDropdownOpen, isStatusDropdownOpen, isLinkEmailDropdownOpen, isStatementPeriodDropdownOpen, isStatementFilterDropdownOpen, isBulkActionsDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, isMergeCustomerDropdownOpen, isNewTransactionDropdownOpen, isGoToTransactionsDropdownOpen, isAttachmentsDropdownOpen, isMoreDropdownOpen, isVendorDropdownOpen, isSettingsDropdownOpen, isSidebarMoreMenuOpen,
        isQuoteStatusDropdownOpen, isRecurringInvoiceStatusDropdownOpen, isExpenseStatusDropdownOpen, isRecurringExpenseStatusDropdownOpen, isProjectStatusDropdownOpen, isBillStatusDropdownOpen, isCreditNoteStatusDropdownOpen, isSalesReceiptStatusDropdownOpen, isSubscriptionDropdownOpen]);

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

    const resetContactPersonModal = () => {
        setNewContactPerson({
            salutation: "Mr",
            firstName: "",
            lastName: "",
            email: "",
            workPhone: "",
            mobile: "",
            skype: "",
            designation: "",
            department: "",
            enablePortalAccess: true
        });
        setContactPersonWorkPhoneCode("+355");
        setContactPersonMobilePhoneCode("+355");
        setContactPersonProfilePreview(null);
        setEditingContactPersonIndex(null);
    };

    const formatPhoneWithCode = (code: string, value: string) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("+")) return trimmed;
        const normalizedCode = String(code || "").trim();
        if (!normalizedCode) return trimmed;
        return `${normalizedCode} ${trimmed}`.trim();
    };

    const splitPhoneCode = (raw: any) => {
        const value = String(raw || "").trim();
        const fallback = { code: "+355", number: "" };
        if (!value) return fallback;
        const match = value.match(/^(\+\d+)\s*(.*)$/);
        if (!match) return { ...fallback, number: value };
        return { code: match[1], number: String(match[2] || "").trim() };
    };

    const openEditContactPerson = (contact: any, index: number) => {
        const work = splitPhoneCode(contact?.workPhone || contact?.phone || "");
        const mobile = splitPhoneCode(contact?.mobile || contact?.mobilePhone || "");

        setEditingContactPersonIndex(index);
        setNewContactPerson({
            salutation: String(contact?.salutation || "Mr"),
            firstName: String(contact?.firstName || ""),
            lastName: String(contact?.lastName || ""),
            email: String(contact?.email || ""),
            workPhone: work.number,
            mobile: mobile.number,
            skype: String(contact?.skype || ""),
            designation: String(contact?.designation || ""),
            department: String(contact?.department || ""),
            enablePortalAccess: Boolean(contact?.hasPortalAccess ?? contact?.enablePortal ?? true),
        });
        setContactPersonWorkPhoneCode(work.code || "+355");
        setContactPersonMobilePhoneCode(mobile.code || "+355");
        setContactPersonProfilePreview(String(contact?.profileImage || contact?.image || "") || null);
        setIsAddContactPersonModalOpen(true);
    };

    const saveContactPerson = async () => {
        if (!customer || !id) return;

        const existingContactPersons = Array.isArray(safeCustomer.contactPersons) ? [...safeCustomer.contactPersons] : [];
        const existing = editingContactPersonIndex !== null ? existingContactPersons[editingContactPersonIndex] : null;

        const contactPerson = {
            ...(existing && typeof existing === "object" ? existing : {}),
            id: (existing as any)?.id ?? Date.now(),
            salutation: newContactPerson.salutation,
            firstName: newContactPerson.firstName,
            lastName: newContactPerson.lastName,
            email: newContactPerson.email,
            workPhone: formatPhoneWithCode(contactPersonWorkPhoneCode, newContactPerson.workPhone),
            mobile: formatPhoneWithCode(contactPersonMobilePhoneCode, newContactPerson.mobile),
            skype: newContactPerson.skype,
            designation: newContactPerson.designation,
            department: newContactPerson.department,
            hasPortalAccess: newContactPerson.enablePortalAccess,
            enablePortal: newContactPerson.enablePortalAccess,
            profileImage: contactPersonProfilePreview,
        };

        const updatedContactPersons =
            editingContactPersonIndex !== null
                ? existingContactPersons.map((cp, idx) => (idx === editingContactPersonIndex ? contactPerson : cp))
                : [...existingContactPersons, { ...contactPerson, isPrimary: existingContactPersons.length === 0 }];

        const updatedCustomer = {
            ...customer,
            contactPersons: updatedContactPersons,
        };

        setIsSavingContactPerson(true);
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            await refreshData();
            toast.success(editingContactPersonIndex !== null ? "Contact person updated." : "Contact person added.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to update contact person.");
            return;
        } finally {
            setIsSavingContactPerson(false);
        }

        setIsAddContactPersonModalOpen(false);
        resetContactPersonModal();
    };

    const markContactPersonAsPrimary = async (index: number) => {
        if (!customer || !id) return;
        const current = Array.isArray(safeCustomer.contactPersons) ? safeCustomer.contactPersons : [];
        if (!current.length) return;

        const updatedContactPersons = current.map((cp: any, idx: number) => ({
            ...(cp && typeof cp === "object" ? cp : {}),
            isPrimary: idx === index,
        }));

        const updatedCustomer = { ...customer, contactPersons: updatedContactPersons };
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            await refreshData();
            toast.success("Marked as primary contact.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to mark as primary.");
        }
    };

    const deleteContactPerson = async (index: number) => {
        if (!customer || !id) return;
        const current = Array.isArray(safeCustomer.contactPersons) ? safeCustomer.contactPersons : [];
        if (!current.length) return;

        const remaining = current.filter((_: any, idx: number) => idx !== index);
        if (remaining.length > 0 && !remaining.some((cp: any) => Boolean(cp?.isPrimary))) {
            remaining[0] = { ...(remaining[0] || {}), isPrimary: true };
        }

        const updatedCustomer = { ...customer, contactPersons: remaining };
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            await refreshData();
            toast.success("Contact person deleted.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete contact person.");
        }
    };

    const openDeleteContactPersonModal = (index: number) => {
        setPendingDeleteContactPersonIndex(index);
        setIsDeleteContactPersonModalOpen(true);
    };

    useEffect(() => {
        if (openContactPersonSettingsIndex === null) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest?.('[data-contact-person-menu-root="true"]')) return;
            setOpenContactPersonSettingsIndex(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openContactPersonSettingsIndex]);

    const handleContactPersonProfileFile = (file: File | null | undefined) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Maximum file size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setContactPersonProfilePreview(String(reader.result || ""));
        };
        reader.onerror = () => {
            toast.error("Failed to read image. Please try again.");
        };
        reader.readAsDataURL(file);
    };

    const openAssociateTagsModal = () => {
        if (!customer) return;
        const reportingTags = Array.isArray((customer as any)?.reportingTags) ? (customer as any).reportingTags : [];
        const legacyTags = Array.isArray((customer as any)?.tags) ? (customer as any).tags : [];
        setAssociateTagsSeed([...(reportingTags || []), ...(legacyTags || [])]);
        setAssociateTagsValues({});
        setIsAssociateTagsModalOpen(true);
    };

    const closeAssociateTagsModal = () => {
        setIsAssociateTagsModalOpen(false);
        setAssociateTagsSeed([]);
        setAssociateTagsValues({});
        setIsSavingAssociateTags(false);
    };

    useEffect(() => {
        if (!isAssociateTagsModalOpen) return;

        const normalizeText = (value: any) => String(value ?? "").trim();
        const getEntryName = (entry: any) => normalizeText(entry?.name || entry?.tagName || entry?.label || entry?.title);
        const getEntryValue = (entry: any) =>
            normalizeText(entry?.value ?? entry?.option ?? entry?.selectedValue ?? entry?.selected ?? entry?.tagValue);

        const loadTags = async () => {
            try {
                const response: any = await reportingTagsAPI.getAll({ limit: 10000 });
                const list = Array.isArray(response?.data) ? response.data : [];
                setAvailableReportingTags(list);

                setAssociateTagsValues((prev) => {
                    if (prev && Object.keys(prev).length > 0) return prev;

                    const next: Record<string, string> = {};
                    list.forEach((tag: any) => {
                        const tagId = String(tag?._id || tag?.id || "").trim();
                        if (!tagId) return;
                        const tagName = normalizeText(tag?.name);
                        const match = (associateTagsSeed || []).find((entry: any) => {
                            if (!entry) return false;
                            if (typeof entry === "string") {
                                const raw = normalizeText(entry);
                                if (!raw || !tagName) return false;
                                return raw.toLowerCase().startsWith(tagName.toLowerCase());
                            }
                            if (typeof entry !== "object") return false;
                            const entryId = normalizeText(entry?.tagId || entry?.id || entry?._id);
                            if (entryId && entryId === tagId) return true;
                            const entryName = getEntryName(entry);
                            return Boolean(tagName && entryName && entryName.toLowerCase() === tagName.toLowerCase());
                        });

                        if (!match) return;
                        if (typeof match === "string") {
                            const raw = normalizeText(match);
                            const rest = tagName ? raw.slice(tagName.length).trim() : "";
                            if (rest) next[tagId] = rest;
                            return;
                        }
                        const val = getEntryValue(match);
                        if (val) next[tagId] = val;
                    });

                    return next;
                });
            } catch {
                toast.error("Failed to load reporting tags.");
            }
        };

        if (availableReportingTags.length === 0) {
            loadTags();
        } else if (Object.keys(associateTagsValues || {}).length === 0) {
            const list = availableReportingTags;
            const next: Record<string, string> = {};
            list.forEach((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return;
                const tagName = normalizeText(tag?.name);
                const match = (associateTagsSeed || []).find((entry: any) => {
                    if (!entry) return false;
                    if (typeof entry === "string") {
                        const raw = normalizeText(entry);
                        if (!raw || !tagName) return false;
                        return raw.toLowerCase().startsWith(tagName.toLowerCase());
                    }
                    if (typeof entry !== "object") return false;
                    const entryId = normalizeText(entry?.tagId || entry?.id || entry?._id);
                    if (entryId && entryId === tagId) return true;
                    const entryName = getEntryName(entry);
                    return Boolean(tagName && entryName && entryName.toLowerCase() === tagName.toLowerCase());
                });

                if (!match) return;
                if (typeof match === "string") {
                    const raw = normalizeText(match);
                    const rest = tagName ? raw.slice(tagName.length).trim() : "";
                    if (rest) next[tagId] = rest;
                    return;
                }
                const val = getEntryValue(match);
                if (val) next[tagId] = val;
            });
            setAssociateTagsValues(next);
        }
    }, [isAssociateTagsModalOpen, availableReportingTags, associateTagsSeed, associateTagsValues]);

    const handleSaveAssociateTags = async () => {
        if (!customer || !id) return;
        if (!Array.isArray(availableReportingTags) || availableReportingTags.length === 0) {
            toast.error("No reporting tags found.");
            return;
        }

        const requiredMissing = availableReportingTags.find((tag: any) => {
            const isRequired = Boolean(tag?.isRequired || tag?.required);
            if (!isRequired) return false;
            const tagId = String(tag?._id || tag?.id || "").trim();
            if (!tagId) return false;
            const val = String(associateTagsValues?.[tagId] || "").trim();
            return !val;
        });
        if (requiredMissing) {
            toast.error("Please fill all required tags.");
            return;
        }

        const nextReportingTags = availableReportingTags
            .map((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return null;
                const val = String(associateTagsValues?.[tagId] || "").trim();
                if (!val) return null;
                return {
                    tagId,
                    name: tag?.name || "Tag",
                    value: val,
                };
            })
            .filter(Boolean);

        setIsSavingAssociateTags(true);
        try {
            const updatedCustomer = {
                ...customer,
                reportingTags: nextReportingTags,
            };
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer as any);
            setCustomers((prev: any) =>
                prev.map((c: any) => (String(c?.id || c?._id || "") === String(id) ? { ...c, reportingTags: nextReportingTags } : c))
            );
            toast.success("Tags updated successfully.");
            closeAssociateTagsModal();
        } catch (error: any) {
            toast.error("Failed to update tags: " + (error?.message || "Unknown error"));
        } finally {
            setIsSavingAssociateTags(false);
        }
    };

    const reloadSidebarCustomerList = async () => {
        try {
            const response = await customersAPI.getAll();
            if (response && response.data) {
                setCustomers(response.data);
            }
        } catch {
            // no-op
        }
    };

    const handleSidebarBulkUpdate = () => {
        setIsBulkActionsDropdownOpen(false);
        navigate("/sales/customers", { state: { openBulkUpdateModal: true, preselectedCustomerIds: selectedCustomers } });
    };

    const handleSidebarBulkDelete = () => {
        setIsBulkActionsDropdownOpen(false);
        navigate("/sales/customers", { state: { openBulkDeleteModal: true, preselectedCustomerIds: selectedCustomers } });
    };

    const handleSidebarBulkMarkActive = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        try {
            await customersAPI.bulkUpdate(selectedCustomers, { status: "active" });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`Marked ${selectedCustomers.length} customer(s) as active`);
            setSelectedCustomers([]);
        } catch {
            toast.error("Failed to mark customers as active. Please try again.");
        }
    };

    const handleSidebarBulkMarkInactive = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        try {
            await customersAPI.bulkUpdate(selectedCustomers, { status: "inactive" });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`Marked ${selectedCustomers.length} customer(s) as inactive`);
            setSelectedCustomers([]);
        } catch {
            toast.error("Failed to mark customers as inactive. Please try again.");
        }
    };

    const handleSidebarBulkEnableConsolidatedBilling = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        setBulkConsolidatedAction("enable");
    };

    const handleSidebarBulkDisableConsolidatedBilling = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        setBulkConsolidatedAction("disable");
    };

    const confirmSidebarBulkConsolidatedBilling = async () => {
        if (!bulkConsolidatedAction) return;
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            setBulkConsolidatedAction(null);
            return;
        }

        const enabled = bulkConsolidatedAction === "enable";
        const ids = [...selectedCustomers];
        const count = ids.length;

        setIsBulkConsolidatedUpdating(true);
        try {
            await customersAPI.bulkUpdate(ids, {
                consolidatedBilling: enabled,
                enableConsolidatedBilling: enabled,
                isConsolidatedBillingEnabled: enabled,
            });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`${enabled ? "Enabled" : "Disabled"} consolidated billing for ${count} customer(s).`);
            setSelectedCustomers([]);
            setBulkConsolidatedAction(null);
        } catch {
            toast.error(`Failed to ${enabled ? "enable" : "disable"} consolidated billing. Please try again.`);
        } finally {
            setIsBulkConsolidatedUpdating(false);
        }
    };

    const handleUnlinkVendor = async () => {
        if (!customer) return;

        const confirmUnlink = window.confirm(`Are you sure you want to unlink "${customer.name || customer.displayName}" from its associated vendor?`);
        if (!confirmUnlink) return;

        try {
            const customerId = String(customer.id || customer._id || "");
            const linkedVendorId = String(customer.linkedVendorId || "").trim();

            await customersAPI.update(customerId, {
                ...customer,
                linkedVendorId: null,
                linkedVendorName: null
            });

            if (linkedVendorId) {
                await vendorsAPI.update(linkedVendorId, {
                    linkedCustomerId: null,
                    linkedCustomerName: null
                });
            }

            // Refresh customer data
            await refreshData();
            setLinkedVendor(null);
            setLinkedVendorPurchases([]);

            toast.success(`Customer "${customer.name || customer.displayName}" has been unlinked from the vendor`);
        } catch (error: any) {
            toast.error('Failed to unlink vendor: ' + (error.message || 'Unknown error'));
        }
        setIsMoreDropdownOpen(false);
    };
    Object.assign(detail, {
        closeAssociateTagsModal,
        confirmSidebarBulkConsolidatedBilling,
        deleteContactPerson,
        formatPhoneWithCode,
        handleClearSelection,
        handleContactPersonProfileFile,
        handleCustomerCheckboxChange,
        handlePrintCustomerStatements,
        handlePrintStatementsSubmit,
        handleSaveAssociateTags,
        handleSelectAllCustomers,
        handleSidebarBulkDelete,
        handleSidebarBulkDisableConsolidatedBilling,
        handleSidebarBulkEnableConsolidatedBilling,
        handleSidebarBulkMarkActive,
        handleSidebarBulkMarkInactive,
        handleSidebarBulkUpdate,
        handleUnlinkVendor,
        markContactPersonAsPrimary,
        openAssociateTagsModal,
        openDeleteContactPersonModal,
        openEditContactPerson,
        openTransactionSection,
        reloadSidebarCustomerList,
        resetContactPersonModal,
        saveContactPerson,
        splitPhoneCode,
        toggleLinkedVendorPurchaseSection,
        toggleSection,
        toggleTransactionSection,
    });
    return detail;
}
