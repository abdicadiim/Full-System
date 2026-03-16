import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    ChevronDown,
    Search,
    Plus,
    MoreHorizontal,
    SlidersHorizontal,
    X,
    Check,
    Star,
    Settings,
    Download,
    RefreshCw,
    GripVertical,
    Pencil,
} from "lucide-react";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";

const SUBSCRIPTIONS_STORAGE_KEY = "taban_subscriptions_v1";

type Column = {
    key: string;
    label: string;
    visible: boolean;
    width: number;
};

const COLUMNS_STORAGE_KEY = "taban_subscriptions_columns_v1";
const DEFAULT_COLUMNS: Column[] = [
    { key: "createdOn", label: "CREATED ON", visible: true, width: 120 },
    { key: "activatedOn", label: "ACTIVATED ON", visible: true, width: 120 },
    { key: "location", label: "LOCATION", visible: true, width: 120 },
    { key: "subscriptionNumber", label: "SUBSCRIPTION#", visible: true, width: 140 },
    { key: "customerName", label: "CUSTOMER NAME", visible: true, width: 220 },
    { key: "planName", label: "PLAN NAME", visible: true, width: 120 },
    { key: "status", label: "STATUS", visible: true, width: 100 },
    { key: "amount", label: "AMOUNT", visible: true, width: 110 },
    { key: "lastBilledOn", label: "LAST BILLED ON", visible: true, width: 120 },
    { key: "nextBillingOn", label: "NEXT BILLING ON", visible: true, width: 120 },
    { key: "referenceNumber", label: "REFERENCE#", visible: true, width: 130 },
    { key: "pauseDate", label: "PAUSE DATE", visible: false, width: 130 },
    { key: "resumeDate", label: "RESUME DATE", visible: false, width: 130 },
    { key: "createdBy", label: "CREATED BY", visible: false, width: 140 },
    { key: "email", label: "EMAIL", visible: false, width: 200 },
    { key: "meteredBillingEnabled", label: "METERED BILLING ENABLED", visible: false, width: 190 },
    { key: "mobilePhone", label: "MOBILE PHONE", visible: false, width: 140 },
    { key: "paymentTerms", label: "PAYMENT TERMS", visible: false, width: 140 },
    { key: "phone", label: "PHONE", visible: false, width: 140 },
    { key: "planCode", label: "PLAN CODE", visible: false, width: 120 },
    { key: "reactivationDate", label: "REACTIVATION DATE", visible: false, width: 150 },
    { key: "salesperson", label: "SALES PERSON", visible: false, width: 140 },
    { key: "scheduledCancellationDate", label: "SCHEDULED CANCELLATION DATE", visible: false, width: 210 },
    { key: "scheduledUpdateDate", label: "SCHEDULED UPDATE DATE", visible: false, width: 190 },
];

const SubscriptionsPage = () => {
    const navigate = useNavigate();
    const { accentColor } = useOrganizationBranding();

    const [filterType, setFilterType] = useState("All Subscriptions");
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelOtherReason, setCancelOtherReason] = useState("");
    const [cancelError, setCancelError] = useState("");
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [pauseWhen, setPauseWhen] = useState<"immediately" | "specific">("immediately");
    const [pauseOnDate, setPauseOnDate] = useState("");
    const [resumeOnDate, setResumeOnDate] = useState("");
    const [pauseReason, setPauseReason] = useState("");
    const [pauseError, setPauseError] = useState("");
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [resumeWhen, setResumeWhen] = useState<"immediately" | "specific">("immediately");
    const [resumeAtDate, setResumeAtDate] = useState("");
    const [resumeReason, setResumeReason] = useState("");
    const [resumeError, setResumeError] = useState("");
    const [isAutochargeModalOpen, setIsAutochargeModalOpen] = useState(false);
    const [autochargeChoice, setAutochargeChoice] = useState<"" | "enable" | "disable">("");
    const [autochargeError, setAutochargeError] = useState("");
    const [isInvoiceTemplateModalOpen, setIsInvoiceTemplateModalOpen] = useState(false);
    const [selectedInvoicePdfTemplate, setSelectedInvoicePdfTemplate] = useState("");
    const [invoiceTemplateError, setInvoiceTemplateError] = useState("");
    const [invoiceTemplateDropdownOpen, setInvoiceTemplateDropdownOpen] = useState(false);
    const [invoiceTemplateSearch, setInvoiceTemplateSearch] = useState("");
    const [isNextBillingModalOpen, setIsNextBillingModalOpen] = useState(false);
    const [nextBillingDate, setNextBillingDate] = useState("");
    const [nextBillingError, setNextBillingError] = useState("");
    const [isPaymentTermsModalOpen, setIsPaymentTermsModalOpen] = useState(false);
    const [selectedPaymentTerm, setSelectedPaymentTerm] = useState("");
    const [paymentTermsError, setPaymentTermsError] = useState("");
    const [paymentTermsDropdownOpen, setPaymentTermsDropdownOpen] = useState(false);
    const [paymentTermsSearch, setPaymentTermsSearch] = useState("");
    const [isUpdateAddressModalOpen, setIsUpdateAddressModalOpen] = useState(false);
    const [addressField, setAddressField] = useState<"billing" | "shipping" | "both">("billing");
    const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
    const [addressError, setAddressError] = useState("");
    const [addressFieldDropdownOpen, setAddressFieldDropdownOpen] = useState(false);
    const [addressFieldSearch, setAddressFieldSearch] = useState("");
    const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
    const [columnSearch, setColumnSearch] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const invoiceTemplateDropdownRef = useRef<HTMLDivElement>(null);
    const paymentTermsDropdownRef = useRef<HTMLDivElement>(null);
    const addressPickerRef = useRef<HTMLDivElement>(null);
    const addressFieldDropdownRef = useRef<HTMLDivElement>(null);

    const [columns, setColumns] = useState<Column[]>(() => {
        const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
        if (!saved) return DEFAULT_COLUMNS;
        try {
            const parsed = JSON.parse(saved);
            return DEFAULT_COLUMNS.map((def) => {
                const found = parsed.find((p: Column) => p.key === def.key);
                return found ? { ...def, ...found } : def;
            });
        } catch {
            return DEFAULT_COLUMNS;
        }
    });

    useEffect(() => {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
    }, [columns]);

    useEffect(() => {
        const load = () => {
            try {
                const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                setSubscriptions(Array.isArray(parsed) ? parsed : []);
            } catch {
                setSubscriptions([]);
            }
        };
        load();
        const onStorage = (event: StorageEvent) => {
            if (!event.key || event.key === SUBSCRIPTIONS_STORAGE_KEY) load();
        };
        const onFocus = () => load();
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", onFocus);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setFilterDropdownOpen(false);
            }
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
                setMoreDropdownOpen(false);
            }
            if (paymentTermsDropdownRef.current && !paymentTermsDropdownRef.current.contains(e.target as Node)) {
                setPaymentTermsDropdownOpen(false);
            }
            if (invoiceTemplateDropdownRef.current && !invoiceTemplateDropdownRef.current.contains(e.target as Node)) {
                setInvoiceTemplateDropdownOpen(false);
            }
            if (addressPickerRef.current && !addressPickerRef.current.contains(e.target as Node)) {
                setIsAddressPickerOpen(false);
            }
            if (addressFieldDropdownRef.current && !addressFieldDropdownRef.current.contains(e.target as Node)) {
                setAddressFieldDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedIds.length > 0) {
            setFilterDropdownOpen(false);
            setMoreDropdownOpen(false);
        }
    }, [selectedIds.length]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (isAutochargeModalOpen) {
                setIsAutochargeModalOpen(false);
                return;
            }
            if (isInvoiceTemplateModalOpen) {
                if (invoiceTemplateDropdownOpen) {
                    setInvoiceTemplateDropdownOpen(false);
                    return;
                }
                setIsInvoiceTemplateModalOpen(false);
                return;
            }
            if (isUpdateAddressModalOpen) {
                if (addressFieldDropdownOpen) {
                    setAddressFieldDropdownOpen(false);
                    return;
                }
                if (isAddressPickerOpen) {
                    setIsAddressPickerOpen(false);
                    return;
                }
                setIsUpdateAddressModalOpen(false);
                return;
            }
            if (isPaymentTermsModalOpen) {
                setPaymentTermsDropdownOpen(false);
                setIsPaymentTermsModalOpen(false);
                return;
            }
            if (isNextBillingModalOpen) {
                setIsNextBillingModalOpen(false);
                return;
            }
            if (isResumeModalOpen) {
                setIsResumeModalOpen(false);
                return;
            }
            if (isPauseModalOpen) {
                setIsPauseModalOpen(false);
                return;
            }
            if (isCancelModalOpen) {
                setIsCancelModalOpen(false);
                return;
            }
            if (isCustomizeModalOpen) {
                setIsCustomizeModalOpen(false);
                return;
            }
            setSelectedIds([]);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        isAutochargeModalOpen,
        isInvoiceTemplateModalOpen,
        invoiceTemplateDropdownOpen,
        isUpdateAddressModalOpen,
        isPaymentTermsModalOpen,
        isNextBillingModalOpen,
        isResumeModalOpen,
        isPauseModalOpen,
        isCancelModalOpen,
        isCustomizeModalOpen,
    ]);

    const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);
    const filteredColumns = useMemo(() => {
        const term = columnSearch.toLowerCase().trim();
        if (!term) return columns;
        return columns.filter((c) => c.label.toLowerCase().includes(term));
    }, [columns, columnSearch]);

    const toggleColumn = (key: string) => {
        setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
    };

    const toggleSelectAll = () => {
        if (!subscriptions.length) return;
        if (selectedIds.length === subscriptions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(subscriptions.map((s: any) => s.id));
        }
    };

    const toggleSelectOne = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const deriveStatus = (sub: any) => {
        const explicit = String(sub?.status || "").toUpperCase();
        if (explicit && !["LIVE", "UNPAID"].includes(explicit)) return explicit;
        const immediate = Number(sub?.immediateCharges ?? 0) || 0;
        const paymentReceived = Boolean(sub?.paymentReceived);
        if (immediate > 0 && !paymentReceived) return "UNPAID";
        return explicit || "LIVE";
    };

    const statusStyles = (status: string) => {
        const normalized = status.toUpperCase();
        if (normalized === "UNPAID") return "text-red-500";
        if (normalized === "CANCELLED" || normalized === "CANCELED") return "text-red-500";
        if (normalized === "EXPIRED") return "text-gray-500";
        if (normalized === "PAUSED") return "text-gray-500";
        return "text-[#1b5e6a]";
    };

    const handleNewSubscription = () => {
        navigate("/sales/subscriptions/new");
    };

    const getCustomerEmail = (sub: any) =>
        String(sub?.customerEmail || sub?.contactPersons?.[0]?.email || "").trim();

    const selectedSubscriptions = useMemo(
        () => subscriptions.filter((s: any) => selectedIds.includes(s?.id)),
        [subscriptions, selectedIds]
    );

    const getCustomerKey = (sub: any) => {
        const id =
            String(
                sub?.customerId ||
                    sub?.customerID ||
                    sub?.customer?.id ||
                    sub?.customer?._id ||
                    sub?.customer?._Id ||
                    ""
            ).trim();
        if (id) return `id:${id}`;
        const name = String(sub?.customerName || "").trim();
        const email = getCustomerEmail(sub);
        return `ne:${name.toLowerCase()}|${email.toLowerCase()}`;
    };

    const hasMultipleCustomersSelected = useMemo(() => {
        const keys = new Set(selectedSubscriptions.map(getCustomerKey));
        return keys.size > 1;
    }, [selectedSubscriptions]);

    const formatDateLabel = (value: Date | string) => {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date);
    };

    const toISODate = (yyyyMmDd: string) => {
        // Local date at noon to avoid TZ edge cases.
        const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
        if (!y || !m || !d) return "";
        return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
    };

    const normalizeAddress = (addr: any) => {
        if (!addr) return null;
        if (typeof addr === "string") {
            const text = addr.trim();
            if (!text) return null;
            return { street1: text };
        }
        if (typeof addr !== "object") return null;
        const keys = [
            "attention",
            "country",
            "street1",
            "street2",
            "city",
            "state",
            "zipCode",
            "phone",
            "fax",
            "phoneNumber",
            "mobile",
            "mobilePhone",
        ];
        const hasValue = keys.some((key) => String(addr?.[key] || "").trim());
        return hasValue ? addr : null;
    };

    const formatAddressLines = (addr: any) => {
        if (!addr) return [];
        const line1 = [addr.street1, addr.street2].filter(Boolean).join(" ").trim();
        const line2 = [addr.city, addr.state, addr.country].filter(Boolean).join(", ").trim();
        const rawPhone = addr.phone || addr.phoneNumber || addr.mobile || addr.mobilePhone || "";
        const phone =
            addr.phoneCountryCode && String(rawPhone || "").trim() && !String(rawPhone).startsWith(String(addr.phoneCountryCode))
                ? `${addr.phoneCountryCode} ${rawPhone}`.trim()
                : rawPhone;
        const lines = [line1, line2].filter(Boolean);
        if (addr.zipCode) {
            const lastIndex = lines.length - 1;
            if (lastIndex >= 0) {
                lines[lastIndex] = `${lines[lastIndex]} ${addr.zipCode}`.trim();
            } else {
                lines.push(String(addr.zipCode));
            }
        }
        if (phone) {
            lines.push(`Phone: ${phone}`);
        }
        return lines;
    };

    const getAddressDisplayLines = (addr: any) => {
        const normalized = normalizeAddress(addr);
        if (!normalized) return [];
        const lines: string[] = [];
        if (String(normalized.attention || "").trim()) lines.push(String(normalized.attention).trim());
        return [...lines, ...formatAddressLines(normalized)];
    };

    const persistSubscriptions = (next: any[]) => {
        setSubscriptions(next);
        try {
            localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // ignore write errors (private mode, quota, etc.)
        }
    };

    const openCancelModal = () => {
        setCancelReason("");
        setCancelOtherReason("");
        setCancelError("");
        setIsCancelModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openPauseModal = () => {
        setPauseWhen("immediately");
        setPauseOnDate("");
        setResumeOnDate("");
        setPauseReason("");
        setPauseError("");
        setIsPauseModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openResumeModal = () => {
        setResumeWhen("immediately");
        setResumeAtDate("");
        setResumeReason("");
        setResumeError("");
        setIsResumeModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openAutochargeModal = () => {
        setAutochargeChoice("");
        setAutochargeError("");
        setIsAutochargeModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openInvoiceTemplateModal = () => {
        setSelectedInvoicePdfTemplate("");
        setInvoiceTemplateError("");
        setInvoiceTemplateDropdownOpen(false);
        setInvoiceTemplateSearch("");
        setIsInvoiceTemplateModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openNextBillingModal = () => {
        setNextBillingDate("");
        setNextBillingError("");
        setIsNextBillingModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openPaymentTermsModal = () => {
        setSelectedPaymentTerm("");
        setPaymentTermsError("");
        setPaymentTermsDropdownOpen(false);
        setPaymentTermsSearch("");
        setIsPaymentTermsModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const openUpdateAddressModal = () => {
        setAddressField("billing");
        setSelectedAddress(null);
        setAddressError("");
        setAddressFieldDropdownOpen(false);
        setAddressFieldSearch("");
        setIsAddressPickerOpen(false);
        setIsUpdateAddressModalOpen(true);
        setMoreDropdownOpen(false);
        setFilterDropdownOpen(false);
    };

    const handleProceedCancel = () => {
        const reason =
            cancelReason === "Others" ? cancelOtherReason.trim() : cancelReason.trim();

        if (!reason) {
            setCancelError("Please select a reason for cancellation.");
            return;
        }

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                status: "CANCELLED",
                cancellationReason: reason,
                scheduledCancellationDate: sub?.scheduledCancellationDate || new Date().toISOString(),
            };
        });

        persistSubscriptions(next);
        setIsCancelModalOpen(false);
        setSelectedIds([]);
        toast.success("Subscriptions cancelled successfully.");
    };

    const handleSavePause = () => {
        if (pauseWhen === "specific" && !pauseOnDate) {
            setPauseError("Please choose the date to pause on.");
            return;
        }
        if (!pauseReason.trim()) {
            setPauseError("Please enter a reason.");
            return;
        }

        const pauseISO =
            pauseWhen === "immediately" ? new Date().toISOString() : toISODate(pauseOnDate);
        const resumeISO = resumeOnDate ? toISODate(resumeOnDate) : "";

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                status: "PAUSED",
                pauseDate: formatDateLabel(pauseISO),
                resumeDate: resumeISO ? formatDateLabel(resumeISO) : "",
                pauseMeta: {
                    when: pauseWhen,
                    pauseOn: pauseISO,
                    resumeOn: resumeISO || null,
                    issueCredits: false,
                    reason: pauseReason.trim(),
                },
            };
        });

        persistSubscriptions(next);
        setIsPauseModalOpen(false);
        setSelectedIds([]);
        toast.success("Subscriptions paused successfully.");
    };

    const handleSaveResume = () => {
        if (resumeWhen === "specific" && !resumeAtDate) {
            setResumeError("Please choose the date to resume on.");
            return;
        }
        if (!resumeReason.trim()) {
            setResumeError("Please enter a reason.");
            return;
        }

        const resumeISO =
            resumeWhen === "immediately" ? new Date().toISOString() : toISODate(resumeAtDate);

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                status: "LIVE",
                resumeDate: formatDateLabel(resumeISO),
                resumeMeta: {
                    when: resumeWhen,
                    resumeOn: resumeISO,
                    issueCredits: false,
                    reason: resumeReason.trim(),
                },
            };
        });

        persistSubscriptions(next);
        setIsResumeModalOpen(false);
        setSelectedIds([]);
        toast.success("Subscriptions resumed successfully.");
    };

    const handleUpdateAutocharge = () => {
        if (!autochargeChoice) {
            setAutochargeError("Please select an option.");
            return;
        }
        const enabled = autochargeChoice === "enable";
        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                autochargeEnabled: enabled,
                autochargeMeta: {
                    enabled,
                    updatedAt: new Date().toISOString(),
                },
            };
        });
        persistSubscriptions(next);
        setIsAutochargeModalOpen(false);
        setSelectedIds([]);
        toast.success("Autocharge updated successfully.");
    };

    const handleUpdateNextBillingDate = () => {
        if (!nextBillingDate) {
            setNextBillingError("Please choose the next billing date.");
            return;
        }

        const nextISO = toISODate(nextBillingDate);
        if (!nextISO) {
            setNextBillingError("Invalid date. Please choose the next billing date.");
            return;
        }

        const label = formatDateLabel(nextISO);
        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                nextBillingOn: label,
                nextBillingOnISO: nextISO,
                billingPostponeMeta: {
                    postponedTo: nextISO,
                    updatedAt: new Date().toISOString(),
                },
            };
        });

        persistSubscriptions(next);
        setIsNextBillingModalOpen(false);
        setSelectedIds([]);
        toast.success("Next billing date updated successfully.");
    };

    const handleProceedPaymentTerms = () => {
        if (!selectedPaymentTerm) {
            setPaymentTermsError("Please select payment terms.");
            return;
        }

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                paymentTerms: selectedPaymentTerm,
                paymentTermsMeta: {
                    terms: selectedPaymentTerm,
                    updatedAt: new Date().toISOString(),
                },
            };
        });

        persistSubscriptions(next);
        setIsPaymentTermsModalOpen(false);
        setSelectedIds([]);
        toast.success("Payment terms updated successfully.");
    };

    const INVOICE_PDF_TEMPLATES = useMemo<string[]>(() => [], []);

    const filteredInvoicePdfTemplates = useMemo(() => {
        const term = invoiceTemplateSearch.toLowerCase().trim();
        if (!term) return INVOICE_PDF_TEMPLATES;
        return INVOICE_PDF_TEMPLATES.filter((t) => t.toLowerCase().includes(term));
    }, [INVOICE_PDF_TEMPLATES, invoiceTemplateSearch]);

    const handleUpdateInvoiceTemplate = () => {
        if (!selectedInvoicePdfTemplate) {
            setInvoiceTemplateError("Please select a PDF template.");
            return;
        }

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            return {
                ...sub,
                invoicePdfTemplate: selectedInvoicePdfTemplate,
                invoicePdfTemplateMeta: {
                    template: selectedInvoicePdfTemplate,
                    updatedAt: new Date().toISOString(),
                },
            };
        });

        persistSubscriptions(next);
        setIsInvoiceTemplateModalOpen(false);
        setSelectedIds([]);
        toast.success("Invoice template updated successfully.");
    };

    const handleProceedUpdateAddress = () => {
        if (hasMultipleCustomersSelected) {
            setAddressError("You cannot update addresses for multiple customers at once.");
            return;
        }
        const value = normalizeAddress(selectedAddress);
        if (!value) {
            setAddressError("Please select an address.");
            return;
        }

        const next = subscriptions.map((sub: any) => {
            if (!selectedIds.includes(sub.id)) return sub;
            const updated: any = { ...sub };
            // Store address object (same format as New Subscription page)
            const cloned = JSON.parse(JSON.stringify(value));
            if (addressField === "billing" || addressField === "both") updated.billingAddress = cloned;
            if (addressField === "shipping" || addressField === "both") updated.shippingAddress = cloned;
            updated.addressUpdateMeta = {
                field: addressField,
                updatedAt: new Date().toISOString(),
            };
            return updated;
        });

        persistSubscriptions(next);
        setIsUpdateAddressModalOpen(false);
        setSelectedIds([]);
        toast.success("Address updated successfully.");
    };

    const handleProceedDelete = () => {
        if (selectedIds.length === 0) {
            setIsDeleteModalOpen(false);
            return;
        }
        const next = subscriptions.filter((sub: any) => !selectedIds.includes(sub.id));
        persistSubscriptions(next);
        setSelectedIds([]);
        setIsDeleteModalOpen(false);
        toast.success("Selected subscriptions deleted.");
    };

    const stickyTopOffset = 0;
    const headerRowRef = useRef<HTMLDivElement | null>(null);
    const [headerRowHeight, setHeaderRowHeight] = useState(56);

    useLayoutEffect(() => {
        const headerHeight = headerRowRef.current?.offsetHeight || 0;
        setHeaderRowHeight(headerHeight || 56);
    }, [selectedIds.length, filterType]);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
            {selectedIds.length > 0 ? (
                <div
                    ref={headerRowRef}
                    className="sticky z-30 flex items-center justify-between px-4 border-b border-gray-100 bg-white relative overflow-visible"
                    style={{ top: stickyTopOffset }}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-2 pr-2 overflow-visible">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap">
                            {[
                                { label: "Cancel Subscriptions", onClick: openCancelModal },
                                { label: "Pause Subscription", onClick: openPauseModal },
                                { label: "Resume Subscription", onClick: openResumeModal },
                                { label: "Next Billing Date", onClick: openNextBillingModal },
                                { label: "Payment Terms", onClick: openPaymentTermsModal },
                                { label: "Update Address", onClick: openUpdateAddressModal },
                            ].map(({ label, onClick }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={onClick}
                                    className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex-shrink-0" ref={moreDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                className="h-9 w-10 flex items-center justify-center border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-white shadow-sm"
                                aria-label="More"
                            >
                                <MoreHorizontal size={18} className="text-gray-500" />
                            </button>

                            {moreDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 py-1">
                                    <button
                                        type="button"
                                        onClick={openAutochargeModal}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Autocharge
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openInvoiceTemplateModal}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Invoice Template
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreDropdownOpen(false);
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        Delete Selected
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="flex items-center justify-center min-w-[28px] h-7 px-2 bg-[#156372] rounded-full text-[13px] font-semibold text-white">
                                {selectedIds.length}
                            </span>
                            <span className="text-sm text-gray-700">Selected</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                        aria-label="Clear selection"
                    >
                        <span className="text-gray-500">Esc</span>
                        <X size={16} className="text-red-500" />
                    </button>
                </div>
            ) : (
                <div
                    ref={headerRowRef}
                    className="sticky z-30 flex items-start justify-between px-4 border-b border-gray-100 bg-white relative overflow-visible"
                    style={{ top: stickyTopOffset }}
                >
                    <div className="flex items-center gap-6 pl-4">
                        <div className="relative" ref={filterDropdownRef}>
                            <div
                                className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[px]"
                                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                            >
                                <h1 className="text-[15px] font-bold text-slate-900 transition-colors">{filterType}</h1>
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${filterDropdownOpen ? "rotate-180" : ""}`}
                                    style={{ color: accentColor }}
                                />
                            </div>

                            {filterDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl z-30 py-2">
                                    {["All Subscriptions", "Active", "Pending", "Cancelled", "Expired"].map((view) => (
                                        <button
                                            key={view}
                                            onClick={() => {
                                                setFilterType(view);
                                                setFilterDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 cursor-pointer group/item transition-colors flex items-center justify-between"
                                        >
                                            <span className={filterType === view ? "text-teal-700 font-medium" : "text-gray-700"}>
                                                {view}
                                            </span>
                                            <Star size={14} className="text-gray-300 group-hover:text-yellow-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mr-4 pt-4">
                        <button
                            onClick={handleNewSubscription}
                            className="cursor-pointer transition-all text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center gap-1"
                            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        >
                            <Plus size={16} />
                            <span>New</span>
                        </button>

                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                aria-label="More"
                            >
                                <MoreHorizontal size={18} className="text-gray-500" />
                            </button>

                            {moreDropdownOpen && (
                                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-2xl z-30 py-1">
                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <Download size={14} /> Export
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <Settings size={14} /> Subscriptions Preferences
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div
                className="flex-1 overflow-auto bg-white min-h-0"
                style={{ height: `calc(100% - ${headerRowHeight}px)` }}
            >
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead
                        className="bg-[#f6f7fb] sticky z-20 border-b border-[#e6e9f2]"
                        style={{ top: 0 }}
                    >
                        <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
                            <th className="px-4 py-3 w-16 min-w-[64px]">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomizeModalOpen(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                        title="Manage Columns"
                                    >
                                        <SlidersHorizontal size={13} style={{ color: accentColor }} />
                                    </button>
                                    <div className="h-5 w-px bg-gray-200" />
                                    <input
                                        type="checkbox"
                                        checked={subscriptions.length > 0 && selectedIds.length === subscriptions.length}
                                        onChange={toggleSelectAll}
                                        style={{ accentColor: accentColor }}
                                        className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                                    />
                                </div>
                            </th>
                            {visibleColumns.map((col) => (
                                <th key={col.key} className="px-4 py-3" style={{ width: col.width }}>
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb]">
                                <div className="flex items-center justify-center">
                                    <Search size={14} className="text-gray-300 cursor-pointer transition-colors hover:opacity-80" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {subscriptions.map((sub: any) => (
                            <tr
                                key={sub.id}
                                className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
                                style={selectedIds.includes(sub.id) ? { backgroundColor: "#1b5e6a1A" } : {}}
                                onClick={() => navigate(`/sales/subscriptions/${sub.id}`)}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-6 w-6 shrink-0" aria-hidden />
                                        <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(sub.id)}
                                            onChange={() => { }}
                                            onClick={(e) => toggleSelectOne(sub.id, e)}
                                            style={{ accentColor: "#1b5e6a" }}
                                            className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                                        />
                                    </div>
                                </td>
                                {visibleColumns.map((col) => {
                                    const value = (sub as any)[col.key];
                                    if (col.key === "customerName") {
                                        return (
                                            <td key={col.key} className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[#1b5e6a] font-medium hover:underline truncate">
                                                        {sub.customerName}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 truncate">{getCustomerEmail(sub) || "-"}</span>
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === "subscriptionNumber") {
                                        return (
                                            <td key={col.key} className="px-4 py-3">
                                                <span className="text-[#1b5e6a] font-medium hover:underline">{sub.subscriptionNumber}</span>
                                            </td>
                                        );
                                    }
                                    if (col.key === "status") {
                                        const status = deriveStatus(sub);
                                        return (
                                            <td key={col.key} className="px-4 py-3">
                                                <span className={`text-[11px] font-bold tracking-wide ${statusStyles(status)}`}>{status}</span>
                                            </td>
                                        );
                                    }
                                    if (col.key === "planName") {
                                        return (
                                            <td key={col.key} className="px-4 py-3 text-gray-700 uppercase">
                                                {sub.planName}
                                            </td>
                                        );
                                    }
                                    if (col.key === "amount") {
                                        return (
                                            <td key={col.key} className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                                                {sub.amount}
                                            </td>
                                        );
                                    }
                                    return (
                                        <td key={col.key} className="px-4 py-3 text-gray-700">
                                            {value || "-"}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors" />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isAutochargeModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[640px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">
                                Toggle autocharge <span className="text-gray-400 font-normal">|</span> Bulk update
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAutochargeModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                You can enable or disable autocharge for the selected subscriptions.
                            </p>

                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2">
                                <label className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="autocharge"
                                        checked={autochargeChoice === "enable"}
                                        onChange={() => {
                                            setAutochargeChoice("enable");
                                            setAutochargeError("");
                                        }}
                                        className="h-4 w-4"
                                        style={{ accentColor: accentColor }}
                                    />
                                    <span>Enable Autocharge</span>
                                </label>
                                <label className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="autocharge"
                                        checked={autochargeChoice === "disable"}
                                        onChange={() => {
                                            setAutochargeChoice("disable");
                                            setAutochargeError("");
                                        }}
                                        className="h-4 w-4"
                                        style={{ accentColor: accentColor }}
                                    />
                                    <span>Disable Autocharge</span>
                                </label>
                            </div>

                            {autochargeError && <div className="text-sm text-red-600">{autochargeError}</div>}

                            <div className="pt-1">
                                <div className="text-sm font-semibold text-slate-600 mb-2">Note:</div>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 leading-relaxed">
                                    <li>
                                        If you disable autocharge for a subscription under dunning management, its status will change from Past Due to Live, since automatic payment retries will not take place. You must collect payments for any unpaid invoices manually.
                                    </li>
                                    <li>
                                        Enabling autocharge will not collect the pending amount (if any) for invoices that have been generated already.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleUpdateAutocharge}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Update
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAutochargeModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isInvoiceTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[560px] rounded-xl bg-white shadow-2xl overflow-visible">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">Bulk Associate PDF Templates</div>
                            <button
                                type="button"
                                onClick={() => setIsInvoiceTemplateModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-4">
                                <div className="text-sm text-gray-700 min-w-[120px]">Invoice PDF</div>
                                <div className="relative flex-1 max-w-[300px] ml-auto" ref={invoiceTemplateDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceTemplateDropdownOpen((v) => !v)}
                                        className={`w-full h-10 px-3 rounded-md border text-sm bg-white flex items-center justify-between gap-3 transition-colors ${
                                            invoiceTemplateDropdownOpen
                                                ? "border-blue-500 ring-2 ring-blue-100"
                                                : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                        aria-haspopup="listbox"
                                        aria-expanded={invoiceTemplateDropdownOpen}
                                    >
                                        <span className={selectedInvoicePdfTemplate ? "text-gray-800" : "text-gray-400"}>
                                            {selectedInvoicePdfTemplate || "Select a PDF template"}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-500 transition-transform ${
                                                invoiceTemplateDropdownOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </button>

                                    {invoiceTemplateDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2 px-2 py-2 rounded-md border border-gray-200 bg-white">
                                                    <Search size={14} className="text-gray-400" />
                                                    <input
                                                        value={invoiceTemplateSearch}
                                                        onChange={(e) => setInvoiceTemplateSearch(e.target.value)}
                                                        placeholder="Search"
                                                        className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="max-h-56 overflow-auto py-1">
                                                {filteredInvoicePdfTemplates.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide">
                                                        NO RESULTS FOUND
                                                    </div>
                                                ) : (
                                                    filteredInvoicePdfTemplates.map((template) => {
                                                        const active = selectedInvoicePdfTemplate === template;
                                                        return (
                                                            <button
                                                                key={template}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedInvoicePdfTemplate(template);
                                                                    setInvoiceTemplateError("");
                                                                    setInvoiceTemplateDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                                                                    active ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                                                                }`}
                                                                role="option"
                                                                aria-selected={active}
                                                            >
                                                                <span>{template}</span>
                                                                {active && <Check size={16} className="text-blue-600" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {invoiceTemplateError && <div className="text-sm text-red-600">{invoiceTemplateError}</div>}

                            <div className="pt-1">
                                <div className="text-sm font-semibold text-slate-600 mb-2">Note:</div>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    The PDF template will be applied to the invoices generated from the selected subscriptions.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleUpdateInvoiceTemplate}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Update
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsInvoiceTemplateModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isUpdateAddressModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[760px] rounded-xl bg-white shadow-2xl overflow-visible">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">Bulk Update Addresses in Subscriptions</div>
                            <button
                                type="button"
                                onClick={() => setIsUpdateAddressModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-600">Choose a field from the dropdown and update with new information.</p>

                            <div className="relative w-[280px]" ref={addressFieldDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setAddressFieldDropdownOpen((v) => !v)}
                                    className={`w-full h-10 px-3 rounded-md border text-sm bg-white flex items-center justify-between gap-3 transition-colors ${
                                        addressFieldDropdownOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                    aria-haspopup="listbox"
                                    aria-expanded={addressFieldDropdownOpen}
                                >
                                    <span className="text-gray-800">
                                        {addressField === "billing"
                                            ? "Billing Address"
                                            : addressField === "shipping"
                                            ? "Shipping Address"
                                            : "Billing and Shipping Address"}
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-gray-500 transition-transform ${addressFieldDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {addressFieldDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                                                <Search size={14} className="text-gray-400" />
                                                <input
                                                    value={addressFieldSearch}
                                                    onChange={(e) => setAddressFieldSearch(e.target.value)}
                                                    placeholder="Search"
                                                    className="w-full text-sm outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-[220px] overflow-y-auto py-1">
                                            {[
                                                { key: "billing", label: "Billing Address" },
                                                { key: "shipping", label: "Shipping Address" },
                                                { key: "both", label: "Billing and Shipping Address" },
                                            ]
                                                .filter((opt) =>
                                                    opt.label.toLowerCase().includes(addressFieldSearch.toLowerCase().trim())
                                                )
                                                .map((opt) => {
                                                    const active = opt.key === addressField;
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => {
                                                                const nextField = opt.key as "billing" | "shipping" | "both";
                                                                setAddressField(nextField);
                                                                setSelectedAddress(null);
                                                                setIsAddressPickerOpen(false);
                                                                setAddressError("");
                                                                setAddressFieldDropdownOpen(false);
                                                                setAddressFieldSearch("");
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                                                                active ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                                                            }`}
                                                            role="option"
                                                            aria-selected={active}
                                                        >
                                                            <span>{opt.label}</span>
                                                            {active && <Check size={16} className="text-blue-600" />}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasMultipleCustomersSelected ? (
                                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 leading-relaxed">
                                    You cannot update the{" "}
                                    {addressField === "billing"
                                        ? "billing address"
                                        : addressField === "shipping"
                                        ? "shipping address"
                                        : "billing and shipping address"}{" "}
                                    for multiple customers at once. Kindly select the subscriptions of a single customer to proceed.
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                                        <div className="relative" ref={addressPickerRef}>
                                            <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                SUBSCRIPTIONS ADDRESS
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddressPickerOpen((v) => !v)}
                                                    className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/70"
                                                    aria-label="Choose address"
                                                    title="Choose address"
                                                >
                                                    <Pencil size={14} className="text-slate-400" />
                                                </button>
                                            </div>

                                            {isAddressPickerOpen && (
                                                <div className="absolute left-32 top-0 w-[380px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 p-3 space-y-3">
                                                    {(() => {
                                                        const first = selectedSubscriptions[0];
                                                        const billing = normalizeAddress(first?.billingAddress);
                                                        const shipping = normalizeAddress(first?.shippingAddress);
                                                        const items = [
                                                            { key: "billing", label: "Billing Address", addr: billing },
                                                            { key: "shipping", label: "Shipping Address", addr: shipping },
                                                        ].filter((i) => i.addr);

                                                        if (items.length === 0) {
                                                            return (
                                                                <div className="text-sm text-gray-500">
                                                                    No billing or shipping address found on the selected subscription.
                                                                </div>
                                                            );
                                                        }

                                                        return items.map((item) => {
                                                            const active = item.addr === selectedAddress;
                                                            const lines = getAddressDisplayLines(item.addr);
                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedAddress(item.addr);
                                                                        setAddressError("");
                                                                        setIsAddressPickerOpen(false);
                                                                    }}
                                                                    className={`w-full text-left rounded-lg border p-3 bg-white transition-colors hover:bg-gray-50 ${
                                                                        active
                                                                            ? "border-blue-500 ring-2 ring-blue-100"
                                                                            : "border-gray-200"
                                                                    }`}
                                                                >
                                                                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                                                        {item.label}
                                                                    </div>
                                                                    <div className="text-[13px] text-gray-700 leading-5 space-y-0.5">
                                                                        {lines.length ? (
                                                                            lines.map((line, idx) => <div key={idx}>{line}</div>)
                                                                        ) : (
                                                                            <div className="text-xs text-gray-400">
                                                                                No address details.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 text-sm text-gray-700">
                                            Customer Name:&nbsp;
                                            <span className="font-medium text-gray-900">
                                                {selectedSubscriptions[0]?.customerName || "-"}
                                            </span>
                                        </div>

                                        {getAddressDisplayLines(selectedAddress).length > 0 && (
                                            <div className="mt-3 text-[13px] text-gray-700 leading-5 space-y-1">
                                                {getAddressDisplayLines(selectedAddress).map((line, idx) => (
                                                    <div key={idx}>{line}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-sm text-slate-600">
                                        <span className="font-semibold">Note:</span>&nbsp;All the selected subscriptions will be updated with the new information and you cannot undo this action.
                                    </div>
                                </>
                            )}

                            {addressError && <div className="text-sm text-red-600">{addressError}</div>}
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleProceedUpdateAddress}
                                disabled={hasMultipleCustomersSelected}
                                className={`px-4 py-2 rounded-md text-sm font-semibold ${
                                    hasMultipleCustomersSelected
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-[#22b573] text-white hover:brightness-95"
                                }`}
                            >
                                Proceed
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsUpdateAddressModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPaymentTermsModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[640px] rounded-xl bg-white shadow-2xl overflow-visible">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">
                                Payment terms <span className="text-gray-400 font-normal">|</span> Bulk update
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPaymentTermsModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                You can update the payment terms of the selected subscriptions in bulk.
                            </p>

                            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-4">
                                <div className="text-sm text-gray-700 min-w-[120px]">Payment Terms</div>
                                <div className="relative flex-1 max-w-[420px] ml-auto" ref={paymentTermsDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentTermsDropdownOpen((v) => !v)}
                                        className={`w-full h-10 px-3 rounded-md border text-sm bg-white flex items-center justify-between gap-3 transition-colors ${
                                            paymentTermsDropdownOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                        aria-haspopup="listbox"
                                        aria-expanded={paymentTermsDropdownOpen}
                                    >
                                        <span className={selectedPaymentTerm ? "text-gray-800" : "text-gray-400"}>
                                            {selectedPaymentTerm || "Select..."}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-500 transition-transform ${paymentTermsDropdownOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {paymentTermsDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                                                    <Search size={14} className="text-gray-400" />
                                                    <input
                                                        value={paymentTermsSearch}
                                                        onChange={(e) => setPaymentTermsSearch(e.target.value)}
                                                        placeholder="Search"
                                                        className="w-full text-sm outline-none"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            <div className="max-h-[280px] overflow-y-auto py-1">
                                                {[
                                                    "Due end of next month",
                                                    "Due end of the month",
                                                    "Due on Receipt",
                                                    "Net 7",
                                                    "Net 15",
                                                    "Net 30",
                                                    "Net 45",
                                                    "Net 60",
                                                ]
                                                    .filter((t) => t.toLowerCase().includes(paymentTermsSearch.toLowerCase().trim()))
                                                    .map((term) => {
                                                        const active = term === selectedPaymentTerm;
                                                        return (
                                                            <button
                                                                key={term}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPaymentTerm(term);
                                                                    setPaymentTermsError("");
                                                                    setPaymentTermsDropdownOpen(false);
                                                                    setPaymentTermsSearch("");
                                                                }}
                                                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                                                                    active ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                                                                }`}
                                                                role="option"
                                                                aria-selected={active}
                                                            >
                                                                <span>{term}</span>
                                                                {active && <Check size={16} className="text-blue-600" />}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {paymentTermsError && <div className="text-sm text-red-600">{paymentTermsError}</div>}

                            <div className="pt-1">
                                <div className="text-sm font-semibold text-slate-600 mb-2">Note:</div>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 leading-relaxed">
                                    <li>
                                        This will reflect for invoices that are generated for these subscriptions henceforth. There will be no change to existing invoices.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleProceedPaymentTerms}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Proceed
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPaymentTermsModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isNextBillingModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[560px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">
                                Postpone billing date <span className="text-gray-400 font-normal">|</span> Bulk update
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNextBillingModalOpen(false)}
                                className="h-8 w-8 rounded-md border border-blue-500 bg-white flex items-center justify-center hover:bg-blue-50"
                                aria-label="Close"
                            >
                                <X size={16} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                You can postpone the next billing date for the selected subscriptions, however, proration will not occur and your customers will not be charged for the extended billing period.
                            </p>

                            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 flex items-center gap-4">
                                <div className="text-sm text-gray-700 min-w-[120px]">Next Billing Date</div>
                                <input
                                    value={nextBillingDate}
                                    onChange={(e) => {
                                        setNextBillingDate(e.target.value);
                                        setNextBillingError("");
                                    }}
                                    placeholder="dd MMM yyyy"
                                    className="flex-1 h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                    onFocus={(e) => (e.currentTarget.type = "date")}
                                    onBlur={(e) => (e.currentTarget.type = "text")}
                                    type="text"
                                />
                            </div>

                            {nextBillingError && <div className="text-sm text-red-600">{nextBillingError}</div>}

                            <div className="pt-1">
                                <div className="text-sm font-semibold text-slate-600 mb-2">Note:</div>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 leading-relaxed">
                                    <li>The postponed billing date will be set as the default billing date for these subscriptions.</li>
                                    <li>Active trials will be extended until the postponed billing date. If this date is before the trial's current end date, the trial period will be cut short and the subscription will activate on the postponed billing date.</li>
                                    <li>Similarly, the activation date of Future subscriptions will change to the postponed billing date.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleUpdateNextBillingDate}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Update
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNextBillingModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isResumeModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[560px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">
                                Resume Subscription <span className="text-gray-400 font-normal">|</span> Bulk Update
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsResumeModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            <div>
                                <div className="text-sm font-medium text-red-500 mb-3">
                                    When do you want to resume this subscription?*
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setResumeWhen("immediately");
                                        setResumeError("");
                                    }}
                                    className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            checked={resumeWhen === "immediately"}
                                            onChange={() => {}}
                                            className="mt-1 h-4 w-4"
                                            style={{ accentColor: accentColor }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">Immediately</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                This subscription will be resumed immediately.
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                <div className="h-3" />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setResumeWhen("specific");
                                        setResumeError("");
                                    }}
                                    className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            checked={resumeWhen === "specific"}
                                            onChange={() => {}}
                                            className="mt-1 h-4 w-4"
                                            style={{ accentColor: accentColor }}
                                        />
                                        <div className="w-full">
                                            <div className="text-sm font-medium text-gray-800">On Specific Date</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                You can choose the date on which you want to resume this subscription.
                                            </div>

                                            {resumeWhen === "specific" && (
                                                <div className="mt-3">
                                                    <div className="text-sm font-medium text-red-500 mb-1">Resume On*</div>
                                                    <input
                                                        value={resumeAtDate}
                                                        onChange={(e) => {
                                                            setResumeAtDate(e.target.value);
                                                            setResumeError("");
                                                        }}
                                                        placeholder="dd MMM yyyy"
                                                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                        onFocus={(e) => (e.currentTarget.type = "date")}
                                                        onBlur={(e) => (e.currentTarget.type = "text")}
                                                        type="text"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-0 pt-3 px-4 pb-4 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="text-sm font-medium text-gray-800">
                                    Issue Credits for Subscriptions' Paused Period
                                </div>
                                <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    This option enables you to generate credit notes for the days a subscription remains paused in its billing cycle. This way, customers only pay for the time they actually use.
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-red-500 mb-2">Reason*</div>
                                <textarea
                                    value={resumeReason}
                                    onChange={(e) => {
                                        setResumeReason(e.target.value);
                                        setResumeError("");
                                    }}
                                    placeholder="Mention why you are resuming this subscription."
                                    className="w-full min-h-[84px] p-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-y bg-white"
                                    maxLength={500}
                                />
                                <div className="text-xs text-gray-500 mt-1">Max. 500 characters</div>
                                {resumeError && <div className="mt-2 text-sm text-red-600">{resumeError}</div>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleSaveResume}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsResumeModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPauseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[560px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                            <div className="text-[16px] font-medium text-gray-800">
                                Pause Subscription <span className="text-gray-400 font-normal">|</span> Bulk Update
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPauseModalOpen(false)}
                                className="h-8 w-8 rounded-md bg-white flex items-center justify-center hover:bg-gray-50"
                                aria-label="Close"
                            >
                                <X size={18} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            <div>
                                <div className="text-sm font-medium text-red-500 mb-3">
                                    When do you want to pause this subscription?*
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setPauseWhen("immediately");
                                        setPauseError("");
                                    }}
                                    className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            checked={pauseWhen === "immediately"}
                                            onChange={() => { }}
                                            className="mt-1 h-4 w-4"
                                            style={{ accentColor: accentColor }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">Immediately</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                This subscription will be paused immediately.
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                <div className="h-3" />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setPauseWhen("specific");
                                        setPauseError("");
                                    }}
                                    className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            checked={pauseWhen === "specific"}
                                            onChange={() => { }}
                                            className="mt-1 h-4 w-4"
                                            style={{ accentColor: accentColor }}
                                        />
                                        <div className="w-full">
                                            <div className="text-sm font-medium text-gray-800">On Specific Date</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                You can choose the date on which you want to pause this subscription.
                                            </div>

                                            {pauseWhen === "specific" && (
                                                <div className="mt-3">
                                                    <div className="text-sm font-medium text-red-500 mb-1">Pause On*</div>
                                                    <input
                                                        value={pauseOnDate}
                                                        onChange={(e) => {
                                                            setPauseOnDate(e.target.value);
                                                            setPauseError("");
                                                        }}
                                                        placeholder="dd MMM yyyy"
                                                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                        onFocus={(e) => (e.currentTarget.type = "date")}
                                                        onBlur={(e) => (e.currentTarget.type = "text")}
                                                    type="text"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                                    <span>Resume On</span>
                                    <span className="text-gray-400">ⓘ</span>
                                </div>
                                <input
                                    value={resumeOnDate}
                                    onChange={(e) => setResumeOnDate(e.target.value)}
                                    placeholder="dd MMM yyyy"
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    onFocus={(e) => (e.currentTarget.type = "date")}
                                    onBlur={(e) => (e.currentTarget.type = "text")}
                                type="text"
                                />
                            </div>

                            <div className="mt-0 pt-3 px-4 pb-4 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="text-sm font-medium text-gray-800">
                                    Issue Credits for Subscriptions' Paused Period
                                </div>
                                <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    This option enables you to generate credit notes for the days a subscription remains paused in its billing cycle. This way, customers only pay for the time they actually use.
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-red-500 mb-2">Reason*</div>
                                <textarea
                                    value={pauseReason}
                                    onChange={(e) => {
                                        setPauseReason(e.target.value);
                                        setPauseError("");
                                    }}
                                    placeholder="Mention why you are pausing this subscription."
                                    className="w-full min-h-[84px] p-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-y bg-white"
                                    maxLength={500}
                                />
                                <div className="text-xs text-gray-500 mt-1">Max. 500 characters</div>
                                {pauseError && <div className="mt-2 text-sm text-red-600">{pauseError}</div>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleSavePause}
                                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPauseModalOpen(false)}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCancelModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[760px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#fbfbfd]">
                            <div className="text-[16px] font-medium text-gray-800">Configure Cancel Subscription</div>
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(false)}
                                className="h-8 w-8 rounded-md border border-blue-500 bg-white flex items-center justify-center hover:bg-blue-50"
                                aria-label="Close"
                            >
                                <X size={16} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-8 py-6">
                            <div className="text-sm font-medium text-red-500 mb-3">Reason for Cancellation*</div>

                            <div className="space-y-2">
                                {["Doesn't meet my needs", "Found a better alternative", "Very Expensive", "Others"].map((reason) => (
                                    <label key={reason} className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="cancel-reason"
                                            value={reason}
                                            checked={cancelReason === reason}
                                            onChange={() => {
                                                setCancelReason(reason);
                                                setCancelError("");
                                            }}
                                            className="h-4 w-4"
                                            style={{ accentColor: accentColor }}
                                        />
                                        <span>{reason}</span>
                                    </label>
                                ))}
                            </div>

                            {cancelReason === "Others" && (
                                <div className="mt-4">
                                    <input
                                        value={cancelOtherReason}
                                        onChange={(e) => {
                                            setCancelOtherReason(e.target.value);
                                            setCancelError("");
                                        }}
                                        placeholder="Type reason..."
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-teal-200"
                                    />
                                </div>
                            )}

                            {cancelError && <div className="mt-3 text-sm text-red-600">{cancelError}</div>}
                        </div>

                        <div className="flex items-center gap-2 px-8 py-5 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleProceedCancel}
                                className="px-5 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                            >
                                Proceed
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(false)}
                                className="px-5 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[10000] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
                    <div className="w-full max-w-[520px] rounded-xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#fbfbfd]">
                            <div className="text-[16px] font-medium text-gray-800">Delete Subscriptions</div>
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="h-8 w-8 rounded-md border border-blue-500 bg-white flex items-center justify-center hover:bg-blue-50"
                                aria-label="Close"
                            >
                                <X size={16} className="text-red-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 text-sm text-gray-700">
                            Are you sure you want to delete the selected subscriptions? This action cannot be undone.
                        </div>

                        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                type="button"
                                onClick={handleProceedDelete}
                                className="px-5 py-2 rounded-md bg-red-500 text-white text-sm font-semibold hover:brightness-95"
                            >
                                Delete
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCustomizeModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto">
                    <div className="w-full max-w-[520px] rounded-lg bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef1f6] bg-[#f8f9fb]">
                            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                                <SlidersHorizontal size={16} />
                                Customize Columns
                            </div>
                            <div className="flex items-center gap-4 text-[12px] text-slate-500">
                                <span>
                                    {visibleColumns.length} of {columns.length} Selected
                                </span>
                                <button
                                    onClick={() => setIsCustomizeModalOpen(false)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100"
                                    aria-label="Close"
                                >
                                    <X size={14} className="text-red-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 border-b border-[#eef1f6] bg-white">
                            <div className="flex items-center gap-2 border border-[#d7dbe7] rounded-md px-3 py-2 bg-white">
                                <Search size={14} className="text-slate-400" />
                                <input
                                    value={columnSearch}
                                    onChange={(e) => setColumnSearch(e.target.value)}
                                    placeholder="Search"
                                    className="w-full text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-3 space-y-2 bg-white">
                            {filteredColumns.map((col) => (
                                <label
                                    key={col.key}
                                    className="flex items-center gap-3 rounded-md bg-[#f8fafc] px-3 py-2 text-[13px] text-slate-700 cursor-pointer"
                                >
                                    <GripVertical size={14} className="text-slate-400" />
                                    <input
                                        type="checkbox"
                                        checked={col.visible}
                                        onChange={() => toggleColumn(col.key)}
                                        className="h-4 w-4 rounded border-gray-300"
                                        style={{ accentColor: "#3b82f6" }}
                                    />
                                    <span>{col.label.replace("ON", "On").replace("DATE", "Date")}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 px-5 py-4 border-t border-[#eef1f6] bg-white">
                            <button
                                onClick={() => setIsCustomizeModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-md bg-[#22b573] text-white font-semibold hover:brightness-95"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setIsCustomizeModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionsPage;
