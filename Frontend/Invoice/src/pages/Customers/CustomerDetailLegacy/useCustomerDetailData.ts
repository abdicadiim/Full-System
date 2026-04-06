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

export function useCustomerDetailData(detail: any) {
    const {
        activeTab,
        attachments,
        comments,
        customer,
        customers,
        invoices,
        linkedVendor,
        loading,
        location,
        mapDocumentsToAttachments,
        navigate,
        normalizeImageSrc,
        organizationProfile,
        payments,
        profileImage,
        setActiveTab,
        setAttachments,
        setAvailableCurrencies,
        setBills,
        setComments,
        setCreditNotes,
        setCustomer,
        setCustomers,
        setExpenses,
        setInvoices,
        setIsLinkedVendorPurchasesLoading,
        setIsRefreshing,
        setJournals,
        setLinkedVendor,
        setLinkedVendorCredits,
        setLinkedVendorPaymentsMade,
        setLinkedVendorPurchaseOrders,
        setLinkedVendorPurchases,
        setLoading,
        setOrganizationProfile,
        setOwnerEmail,
        setPayments,
        setProfileImage,
        setProjects,
        setQuotes,
        setRecurringExpenses,
        setRecurringInvoices,
        setSalesReceipts,
        setVendors,
    } = detail as any;
    const params = useParams();
    const routeCustomerId = String(params.id ?? "").trim();
    const safeArray = (value: any) => (Array.isArray(value) ? value : []);
    const getCustomerRefId = (row: any) =>
        String(
            row?.customerId ||
            row?.customer?._id ||
            row?.customer?.id ||
            row?.customer ||
            ""
        ).trim();
    const filterRowsForCustomer = (rows: any[], customerId: string) =>
        safeArray(rows).filter((row: any) => getCustomerRefId(row) === customerId);
    const createEmptyCustomer = () => ({
        contactPersons: [],
        additionalAddresses: [],
        reportingTags: [],
        tags: [],
    });
    useEffect(() => {
        // Set profile image when customer is loaded or updated
        if (customer?.profileImage) {
            setProfileImage(normalizeImageSrc(customer.profileImage));
        } else {
            // Reset to null if customer doesn't have a profile image
            setProfileImage(null);
        }
    }, [customer]);

    const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            const normalized = typeof base64String === "string" ? base64String : null;
            if (!normalized) {
                toast.error('Error reading image file');
                return;
            }

            // Optimistically update UI
            setProfileImage(normalized);

            if (customer && routeCustomerId) {
                try {
                    // Only send profileImage field to avoid sending entire customer object
                    const updateData = {
                        profileImage: normalized
                    };

                    const response = await customersAPI.update(routeCustomerId, updateData);

                    // Update customer state with response data
                    if (response && response.data) {
                        setCustomer(response.data);
                        toast.success('Profile image updated successfully');
                    } else {
                        // Fallback: update local state
                        setCustomer({
                            ...customer,
                            profileImage: normalized
                        });
                        toast.success('Profile image updated successfully');
                    }
                } catch (error) {
                    // Revert UI change on error
                    setProfileImage(normalizeImageSrc(customer.profileImage));
                    toast.error('Failed to update profile image: ' + ((error as any).message || 'Unknown error'));
                }
            }
        };

        reader.onerror = () => {
            toast.error('Error reading image file');
        };

        reader.readAsDataURL(file);
    };

    // Fetch organization profile data
    const fetchOrganizationProfile = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                // Set fallback data from localStorage if available
                const fallbackProfile = localStorage.getItem('organization_profile');
                if (fallbackProfile) {
                    setOrganizationProfile(JSON.parse(fallbackProfile));
                }
                return;
            }

            const response = await fetch('/api/settings/organization/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setOrganizationProfile(data.data);
                    // Cache in localStorage for offline/fallback use
                    localStorage.setItem('organization_profile', JSON.stringify(data.data));
                }
            } else {
                // Try fallback
                const fallbackProfile = localStorage.getItem('organization_profile');
                if (fallbackProfile) {
                    setOrganizationProfile(JSON.parse(fallbackProfile));
                }
            }
        } catch (error) {
            // Set fallback data from localStorage if available
            const fallbackProfile = localStorage.getItem('organization_profile');
            if (fallbackProfile) {
                setOrganizationProfile(JSON.parse(fallbackProfile));
            }
        }
    };

    // Fetch owner email data
    const fetchOwnerEmail = async () => {
        try {
            const primarySenderRes = await senderEmailsAPI.getPrimary();
            const fallbackName = String(organizationProfile?.name || "Taban Enterprise").trim() || "Taban Enterprise";
            const fallbackEmail = String(organizationProfile?.email || "").trim();
            setOwnerEmail(resolveVerifiedPrimarySender(primarySenderRes, fallbackName, fallbackEmail));
        } catch (error) {
        }
    };

    // Consolidated data loading with refresh function
    const refreshData = async () => {
        if (!routeCustomerId) return;

        setIsRefreshing(true);
        try {
            const customerId = routeCustomerId;

            const [
                customerResponse,
                currenciesData,
                customersResponse,
                invoicesResponse,
                paymentsResponse,
                creditNotesResponse,
                quotesResponse,
                recurringInvoicesResponse,
                expensesResponse,
                recurringExpensesResponse,
                projectsResponse,
                billsResponse,
                salesReceiptsResponse,
                journalsResponse,
                vendorsResponse
            ] = await Promise.all([
                customersAPI.getById(customerId),
                currenciesAPI.getAll(),
                customersAPI.getAll({ limit: 1000 }),
                invoicesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                paymentsReceivedAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                creditNotesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                quotesAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                recurringInvoicesAPI.getAll().catch(() => ({ success: true, data: [] })),
                expensesAPI.getAll().catch(() => ({ success: true, data: [] })),
                recurringExpensesAPI.getAll().catch(() => ({ success: true, data: [] })),
                projectsAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                billsAPI.getAll().catch(() => ({ success: true, data: [] })),
                salesReceiptsAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                journalEntriesAPI.getAll().catch(() => ({ success: true, data: [] })),
                vendorsAPI.getAll().catch(() => ({ success: true, data: [] }))
            ]);

            // Process customer data
            if (customerResponse && customerResponse.success && customerResponse.data) {
                const customerData = customerResponse.data;

                // Ensure name is always set with proper fallbacks
                let customerName = customerData.displayName || customerData.name;
                if (!customerName || customerName.trim() === '') {
                    const firstName = customerData.firstName || '';
                    const lastName = customerData.lastName || '';
                    const companyName = customerData.companyName || '';

                    if (firstName || lastName) {
                        customerName = `${firstName} ${lastName}`.trim();
                    } else if (companyName) {
                        customerName = companyName.trim();
                    } else {
                        customerName = 'Customer';
                    }
                }
                customerName = customerName.trim() || 'Customer';
                const normalizedComments = normalizeComments(customerData.comments);

                const mappedCustomer = {
                    ...customerData,
                    id: String(customerData._id || customerData.id),
                    name: customerName,
                    displayName: customerData.displayName || customerName,
                    billingAttention: customerData.billingAddress?.attention || customerData.billingAttention || '',
                    billingCountry: customerData.billingAddress?.country || customerData.billingCountry || '',
                    billingStreet1: customerData.billingAddress?.street1 || customerData.billingStreet1 || '',
                    billingStreet2: customerData.billingAddress?.street2 || customerData.billingStreet2 || '',
                    billingCity: customerData.billingAddress?.city || customerData.billingCity || '',
                    billingState: customerData.billingAddress?.state || customerData.billingState || '',
                    billingZipCode: customerData.billingAddress?.zipCode || customerData.billingZipCode || '',
                    billingPhone: customerData.billingAddress?.phone || customerData.billingPhone || '',
                    billingFax: customerData.billingAddress?.fax || customerData.billingFax || '',
                    shippingAttention: customerData.shippingAddress?.attention || customerData.shippingAttention || '',
                    shippingCountry: customerData.shippingAddress?.country || customerData.shippingCountry || '',
                    shippingStreet1: customerData.shippingAddress?.street1 || customerData.shippingStreet1 || '',
                    shippingStreet2: customerData.shippingAddress?.street2 || customerData.shippingStreet2 || '',
                    shippingCity: customerData.shippingAddress?.city || customerData.shippingCity || '',
                    shippingState: customerData.shippingAddress?.state || customerData.shippingState || '',
                    shippingZipCode: customerData.shippingAddress?.zipCode || customerData.shippingZipCode || '',
                    shippingPhone: customerData.shippingAddress?.phone || customerData.shippingPhone || '',
                    shippingFax: customerData.shippingAddress?.fax || customerData.shippingFax || '',
                    remarks: customerData.remarks || customerData.notes || '',
                    comments: normalizedComments
                };
                setCustomer(mappedCustomer);
                setComments(normalizedComments);

                // Load attachments from customer documents
                setAttachments(mapDocumentsToAttachments(customerData.documents || []));

                // Mails are derived from local mail log + transactions for this customer
            } else {
                navigate("/sales/customers");
                return;
            }

            // Process invoices
            if (invoicesResponse && invoicesResponse.success && invoicesResponse.data) {
                const invoiceCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || '');
                const customerInvoices = safeArray(invoicesResponse.data).filter((inv: any) => {
                    const invCustomerId = String(inv.customerId || inv.customer?._id || inv.customer || '').trim();
                    return invCustomerId === invoiceCustomerId;
                });
                setInvoices(customerInvoices);
            } else {
                setInvoices([]);
            }

            // Process payments
            if (paymentsResponse && paymentsResponse.success && paymentsResponse.data) {
                const paymentCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || '');
                const customerPayments = filterRowsForCustomer(paymentsResponse.data, paymentCustomerId);
                setPayments(customerPayments);
            } else {
                setPayments([]);
            }

            // Process credit notes
            if (creditNotesResponse && creditNotesResponse.success && creditNotesResponse.data) {
                const cnCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || '');
                const customerCreditNotes = safeArray(creditNotesResponse.data).filter((cn: any) => {
                    const cnCustId = String(cn.customerId || cn.customer?._id || cn.customer || '').trim();
                    return cnCustId === cnCustomerId;
                });
                setCreditNotes(customerCreditNotes);
            } else {
                setCreditNotes([]);
            }

            // Process currencies
            if (currenciesData && Array.isArray(currenciesData)) {
                setAvailableCurrencies(safeArray(currenciesData).filter((c: any) => c.status === 'active'));
            }

            // Process customers list
            if (customersResponse && customersResponse.success && customersResponse.data) {
                setCustomers(safeArray(customersResponse.data).map((c: any) => ({
                    ...c,
                    id: String(c._id || c.id),
                    name: c.displayName || c.name
                })));
            }

            // Process Quotes
            if (quotesResponse && quotesResponse.success && quotesResponse.data) {
                const quoteCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || '');
                setQuotes(filterRowsForCustomer(quotesResponse.data, quoteCustomerId));
            }

            // Process Recurring Invoices
            if (recurringInvoicesResponse && recurringInvoicesResponse.success && recurringInvoicesResponse.data) {
                const customerRI = safeArray(recurringInvoicesResponse.data).filter((ri: any) =>
                    String(ri.customerId || ri.customer?._id || ri.customer || '').trim() === customerId
                );
                setRecurringInvoices(customerRI);
            }

            // Process Expenses
            if (expensesResponse && expensesResponse.success && expensesResponse.data) {
                const customerExp = safeArray(expensesResponse.data).filter((exp: any) =>
                    String(exp.customerId || exp.customer?._id || exp.customer || '').trim() === customerId
                );
                setExpenses(customerExp);
            }

            // Process Recurring Expenses
            if (recurringExpensesResponse && recurringExpensesResponse.success && recurringExpensesResponse.data) {
                const customerRE = safeArray(recurringExpensesResponse.data).filter((re: any) =>
                    String(re.customerId || re.customer?._id || re.customer || '').trim() === customerId
                );
                setRecurringExpenses(customerRE);
            }

            // Process Projects
            if (projectsResponse && projectsResponse.success && projectsResponse.data) {
                setProjects(safeArray(projectsResponse.data));
            }

            // Process Bills
            if (billsResponse && billsResponse.success && billsResponse.data) {
                const customerBills = safeArray(billsResponse.data).filter((bill: any) =>
                    String(bill.customerId || bill.customer?._id || bill.customer || '').trim() === customerId
                );
                setBills(customerBills);
            }

            // Process Sales Receipts
            if (salesReceiptsResponse && salesReceiptsResponse.success && salesReceiptsResponse.data) {
                const receiptCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || '');
                setSalesReceipts(filterRowsForCustomer(salesReceiptsResponse.data, receiptCustomerId));
            }

            // Process Journals
            if (journalsResponse && journalsResponse.success && journalsResponse.data) {
                const customerJournals = safeArray(journalsResponse.data).filter((journal: any) =>
                    String(journal.customerId || journal.customer?._id || journal.customer || '').trim() === customerId
                );
                setJournals(customerJournals);
            }

            // Process Vendors list
            if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
                const mappedVendors = vendorsResponse.data.map((v: any) => ({
                    ...v,
                    id: String(v._id || v.id),
                    name: v.displayName || v.vendorName || v.companyName || v.name
                }));
                setVendors(mappedVendors);

                // If customer has a linked vendor, find it in the list
                if (customerResponse?.data?.linkedVendorId) {
                    const foundVendor = mappedVendors.find((v: any) => String(v.id) === String(customerResponse.data.linkedVendorId));
                    if (foundVendor) {
                        setLinkedVendor(foundVendor);
                    } else {
                        setLinkedVendor(null);
                    }
                } else {
                    setLinkedVendor(null);
                }
            }

        } catch (error: any) {
            toast.error('Failed to refresh customer data: ' + (error.message || 'Unknown error'));
        } finally {
            setIsRefreshing(false);
        }
    };

    // Load customer data when ID changes
    useEffect(() => {
        let isActive = true;
        const loadData = async () => {
            if (!routeCustomerId) return;

            const customerId = routeCustomerId;
            const prefill = (location.state as any)?.customer || null;
            const prefillId = prefill ? String(prefill._id || prefill.id || "").trim() : "";
            if (prefill && prefillId && prefillId === customerId) {
                // Ensure name/displayName are present so header doesn't flash wrong values.
                const prefillName =
                    prefill.displayName ||
                    prefill.name ||
                    prefill.companyName ||
                    `${prefill.firstName || ""} ${prefill.lastName || ""}`.trim() ||
                    "Customer";
                setCustomer({
                    ...prefill,
                    id: String(prefill._id || prefill.id),
                    _id: prefill._id || prefill.id,
                    name: prefillName,
                    displayName: prefill.displayName || prefillName
                });
                setComments(normalizeComments(prefill.comments));
                setLoading(false);
            } else {
                // Avoid showing previous customer's state for a different ID.
                setCustomer(createEmptyCustomer());
                setComments([]);
                setLoading(true);
            }
            try {
                const [
                    customerResponse,
                    currenciesData,
                    customersResponse
                ] = await Promise.all([
                    customersAPI.getById(customerId),
                    currenciesAPI.getAll(),
                    customersAPI.getAll({ limit: 1000 })
                ]);

                // Process customer data
                if (customerResponse && customerResponse.success && customerResponse.data) {
                    const customerData = customerResponse.data;

                    // Ensure name is always set with proper fallbacks
                    let customerName = customerData.displayName || customerData.name;
                    if (!customerName || customerName.trim() === '') {
                        const firstName = customerData.firstName || '';
                        const lastName = customerData.lastName || '';
                        const companyName = customerData.companyName || '';

                        if (firstName || lastName) {
                            customerName = `${firstName} ${lastName}`.trim();
                        } else if (companyName) {
                            customerName = companyName.trim();
                        } else {
                            customerName = 'Customer';
                        }
                    }
                    customerName = customerName.trim() || 'Customer';
                    const normalizedComments = normalizeComments(customerData.comments);

                    const mappedCustomer = {
                        ...customerData,
                        id: String(customerData._id || customerData.id),
                        name: customerName,
                        displayName: customerData.displayName || customerName,
                        // Map addresses if they're nested
                        billingAttention: customerData.billingAddress?.attention || customerData.billingAttention || '',
                        billingCountry: customerData.billingAddress?.country || customerData.billingCountry || '',
                        billingStreet1: customerData.billingAddress?.street1 || customerData.billingStreet1 || '',
                        billingStreet2: customerData.billingAddress?.street2 || customerData.billingStreet2 || '',
                        billingCity: customerData.billingAddress?.city || customerData.billingCity || '',
                        billingState: customerData.billingAddress?.state || customerData.billingState || '',
                        billingZipCode: customerData.billingAddress?.zipCode || customerData.billingZipCode || '',
                        billingPhone: customerData.billingAddress?.phone || customerData.billingPhone || '',
                        billingFax: customerData.billingAddress?.fax || customerData.billingFax || '',
                        shippingAttention: customerData.shippingAddress?.attention || customerData.shippingAttention || '',
                        shippingCountry: customerData.shippingAddress?.country || customerData.shippingCountry || '',
                        shippingStreet1: customerData.shippingAddress?.street1 || customerData.shippingStreet1 || '',
                        shippingStreet2: customerData.shippingAddress?.street2 || customerData.shippingStreet2 || '',
                        shippingCity: customerData.shippingAddress?.city || customerData.shippingCity || '',
                        shippingState: customerData.shippingAddress?.state || customerData.shippingState || '',
                        shippingZipCode: customerData.shippingAddress?.zipCode || customerData.shippingZipCode || '',
                        shippingPhone: customerData.shippingAddress?.phone || customerData.shippingPhone || '',
                        shippingFax: customerData.shippingAddress?.fax || customerData.shippingFax || '',
                        remarks: customerData.remarks || customerData.notes || '',
                        comments: normalizedComments
                    };
                    setCustomer(mappedCustomer);
                    setComments(normalizedComments);
                    setAttachments(mapDocumentsToAttachments(customerData.documents || []));

                    // Mails are derived from local mail log + transactions for this customer
                } else {
                    navigate("/sales/customers");
                    return;
                }

                // Process currencies
                if (currenciesData && Array.isArray(currenciesData)) {
                    setAvailableCurrencies(safeArray(currenciesData).filter(c => c.status === 'active'));
                }

                // Process customers list
                if (customersResponse && customersResponse.success && customersResponse.data) {
                    setCustomers((customersResponse.data as any[]).map(c => ({
                        ...c,
                        id: String(c._id || c.id),
                        name: c.displayName || c.name
                    })) as ExtendedCustomer[]);
                }

                if (!isActive) return;
                setLoading(false);

                const canonicalCustomerId = String(customerResponse?.data?._id || customerResponse?.data?.id || customerId).trim();
                const linkedVendorId = String(customerResponse?.data?.linkedVendorId || "").trim();

                // Load heavy/secondary datasets in the background to avoid blocking initial render.
                const loadSupplementaryData = async () => {
                    try {
                        const [
                            invoicesResponse,
                            paymentsResponse,
                            creditNotesResponse,
                            quotesResponse,
                            recurringInvoicesResponse,
                            expensesResponse,
                            recurringExpensesResponse,
                            projectsResponse,
                            billsResponse,
                            salesReceiptsResponse,
                            journalsResponse,
                            vendorsResponse
                        ] = await Promise.all([
                            invoicesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                            paymentsReceivedAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                            creditNotesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                            quotesAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                            recurringInvoicesAPI.getAll().catch(() => ({ success: true, data: [] })),
                            expensesAPI.getAll().catch(() => ({ success: true, data: [] })),
                            recurringExpensesAPI.getAll().catch(() => ({ success: true, data: [] })),
                            projectsAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
                            billsAPI.getAll().catch(() => ({ success: true, data: [] })),
                            salesReceiptsAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
                            journalEntriesAPI.getAll().catch(() => ({ success: true, data: [] })),
                            vendorsAPI.getAll().catch(() => ({ success: true, data: [] }))
                        ]);

                        if (!isActive) return;

                        // Process invoices
                        if (invoicesResponse && invoicesResponse.success && invoicesResponse.data) {
                            const customerInvoices = safeArray(invoicesResponse.data).filter((inv: any) => {
                                const invCustomerId = String(inv.customerId || inv.customer?._id || inv.customer || '').trim();
                                return invCustomerId === canonicalCustomerId;
                            });
                            setInvoices(customerInvoices);
                        } else {
                            setInvoices([]);
                        }

                        // Process payments
                        if (paymentsResponse && paymentsResponse.success && paymentsResponse.data) {
                            const customerPayments = filterRowsForCustomer(paymentsResponse.data, canonicalCustomerId);
                            setPayments(customerPayments);
                        } else {
                            setPayments([]);
                        }

                        // Process credit notes
                        if (creditNotesResponse && creditNotesResponse.success && creditNotesResponse.data) {
                            const customerCreditNotes = safeArray(creditNotesResponse.data).filter((cn: any) => {
                                const cnCustId = String(cn.customerId || cn.customer?._id || cn.customer || '').trim();
                                return cnCustId === canonicalCustomerId;
                            });
                            setCreditNotes(customerCreditNotes);
                        } else {
                            setCreditNotes([]);
                        }

                        // Process Quotes
                        if (quotesResponse && quotesResponse.success && quotesResponse.data) {
                            setQuotes(filterRowsForCustomer(quotesResponse.data, canonicalCustomerId));
                        }

                        // Process Recurring Invoices
                        if (recurringInvoicesResponse && recurringInvoicesResponse.success && recurringInvoicesResponse.data) {
                            const customerRI = safeArray(recurringInvoicesResponse.data).filter((ri: any) =>
                                String(ri.customerId || ri.customer?._id || ri.customer || '').trim() === canonicalCustomerId
                            );
                            setRecurringInvoices(customerRI);
                        }

                        // Process Expenses
                        if (expensesResponse && expensesResponse.success && expensesResponse.data) {
                            const customerExp = safeArray(expensesResponse.data).filter((exp: any) =>
                                String(exp.customerId || exp.customer?._id || exp.customer || '').trim() === canonicalCustomerId
                            );
                            setExpenses(customerExp);
                        }

                        // Process Recurring Expenses
                        if (recurringExpensesResponse && recurringExpensesResponse.success && recurringExpensesResponse.data) {
                            const customerRE = safeArray(recurringExpensesResponse.data).filter((re: any) =>
                                String(re.customerId || re.customer?._id || re.customer || '').trim() === canonicalCustomerId
                            );
                            setRecurringExpenses(customerRE);
                        }

                        // Process Projects
                        if (projectsResponse && projectsResponse.success && projectsResponse.data) {
                            setProjects(safeArray(projectsResponse.data));
                        }

                        // Process Bills
                        if (billsResponse && billsResponse.success && billsResponse.data) {
                            const customerBills = safeArray(billsResponse.data).filter((bill: any) =>
                                String(bill.customerId || bill.customer?._id || bill.customer || '').trim() === canonicalCustomerId
                            );
                            setBills(customerBills);
                        }

                        // Process Sales Receipts
                        if (salesReceiptsResponse && salesReceiptsResponse.success && salesReceiptsResponse.data) {
                            setSalesReceipts(filterRowsForCustomer(salesReceiptsResponse.data, canonicalCustomerId));
                        }

                        // Process Journals
                        if (journalsResponse && journalsResponse.success && journalsResponse.data) {
                            const customerJournals = safeArray(journalsResponse.data).filter((journal: any) =>
                                String(journal.customerId || journal.customer?._id || journal.customer || '').trim() === canonicalCustomerId
                            );
                            setJournals(customerJournals);
                        }

                        // Process Vendors list
                        if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
                            const mappedVendors = vendorsResponse.data.map((v: any) => ({
                                ...v,
                                id: String(v._id || v.id),
                                name: v.displayName || v.vendorName || v.companyName || v.name
                            }));
                            setVendors(mappedVendors);

                            if (linkedVendorId) {
                                const foundVendor = mappedVendors.find((v: any) => String(v.id) === linkedVendorId);
                                setLinkedVendor(foundVendor || null);
                            } else {
                                setLinkedVendor(null);
                            }
                        }
                    } catch (error: any) {
                        if (!isActive) return;
                        toast.error('Failed to load customer details: ' + (error.message || 'Unknown error'));
                    }
                };

                loadSupplementaryData();
            } catch (error: any) {
                if (!isActive) return;
                toast.error('Error loading customer: ' + (error.message || 'Unknown error'));
                navigate("/sales/customers");
            }
        };

        loadData();
        fetchOrganizationProfile(); // Fetch organization profile for statement generation
        fetchOwnerEmail(); // Fetch owner email for statement generation

        return () => {
            isActive = false;
        };
    }, [routeCustomerId, location?.pathname, location?.search, location?.hash]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        const linkedVendorId = String(customer?.linkedVendorId || "").trim();
        if (!linkedVendorId) {
            setLinkedVendorPurchases([]);
            setLinkedVendorPaymentsMade([]);
            setLinkedVendorPurchaseOrders([]);
            setLinkedVendorCredits([]);
            return;
        }

        let isActive = true;
        const loadLinkedVendorPurchases = async () => {
            setIsLinkedVendorPurchasesLoading(true);
            try {
                const linkedVendorName = String(customer?.linkedVendorName || linkedVendor?.name || "").toLowerCase().trim();
                const matchesLinkedVendor = (row: any) => {
                    const rowVendorId = String(
                        row.vendorId || row.vendor?._id || row.vendor || row.vendor_id || ""
                    ).trim();
                    if (rowVendorId && rowVendorId === linkedVendorId) return true;

                    const rowVendorName = String(
                        row.vendorName || row.vendor_name || row.vendor?.name || ""
                    ).toLowerCase().trim();
                    return Boolean(
                        linkedVendorName &&
                        rowVendorName &&
                        (rowVendorName === linkedVendorName ||
                            rowVendorName.includes(linkedVendorName) ||
                            linkedVendorName.includes(rowVendorName))
                    );
                };

                const [billsByVendorResponse, allBillsResponse, paymentsMadeResponse, purchaseOrdersResponse, vendorCreditsResponse] = await Promise.all([
                    billsAPI.getByVendor(linkedVendorId).catch(() => null),
                    billsAPI.getAll().catch(() => ({ data: [] })),
                    paymentsMadeAPI.getAll().catch(() => ({ data: [] })),
                    purchaseOrdersAPI.getAll().catch(() => ({ data: [] })),
                    vendorCreditsAPI.getAll().catch(() => ({ data: [] }))
                ]);

                let vendorBills: any[] = Array.isArray(billsByVendorResponse?.data)
                    ? billsByVendorResponse.data
                    : (Array.isArray(billsByVendorResponse) ? billsByVendorResponse : []);
                if (vendorBills.length === 0) {
                    const allBills = Array.isArray(allBillsResponse?.data)
                        ? allBillsResponse.data
                        : (Array.isArray(allBillsResponse) ? allBillsResponse : []);
                    vendorBills = safeArray(allBills).filter(matchesLinkedVendor);
                }

                const allPaymentsMade = Array.isArray(paymentsMadeResponse?.data)
                    ? paymentsMadeResponse.data
                    : (Array.isArray(paymentsMadeResponse) ? paymentsMadeResponse : []);
                const allPurchaseOrders = Array.isArray(purchaseOrdersResponse?.data)
                    ? purchaseOrdersResponse.data
                    : (Array.isArray(purchaseOrdersResponse) ? purchaseOrdersResponse : []);
                const allVendorCredits = Array.isArray(vendorCreditsResponse?.data)
                    ? vendorCreditsResponse.data
                    : (Array.isArray(vendorCreditsResponse) ? vendorCreditsResponse : []);

                const vendorPaymentsMade = safeArray(allPaymentsMade).filter(matchesLinkedVendor);
                const vendorPurchaseOrders = safeArray(allPurchaseOrders).filter(matchesLinkedVendor);
                const vendorCredits = safeArray(allVendorCredits).filter(matchesLinkedVendor);

                if (isActive) {
                    setLinkedVendorPurchases(vendorBills);
                    setLinkedVendorPaymentsMade(vendorPaymentsMade);
                    setLinkedVendorPurchaseOrders(vendorPurchaseOrders);
                    setLinkedVendorCredits(vendorCredits);
                }
            } catch (error) {
                if (isActive) {
                    setLinkedVendorPurchases([]);
                    setLinkedVendorPaymentsMade([]);
                    setLinkedVendorPurchaseOrders([]);
                    setLinkedVendorCredits([]);
                }
            } finally {
                if (isActive) setIsLinkedVendorPurchasesLoading(false);
            }
        };

        loadLinkedVendorPurchases();
        return () => {
            isActive = false;
        };
    }, [customer?.linkedVendorId, customer?.linkedVendorName, linkedVendor?.name]);

    useEffect(() => {
        if (activeTab === "purchases" && !customer?.linkedVendorId) {
            setActiveTab("overview");
        }
    }, [activeTab, customer?.linkedVendorId]);

    Object.assign(detail, {
        fetchOrganizationProfile,
        fetchOwnerEmail,
        handleProfileImageUpload,
        refreshData,
    });
    return detail;
}
