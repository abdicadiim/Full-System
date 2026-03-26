import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Search, Upload as UploadIcon, Trash2, Image as ImageIcon, File, X, Plus, PlusCircle, Mail, Building2 } from "lucide-react";
import { toast } from "react-toastify";

import DatePicker from "../../../components/DatePicker";
import { chartOfAccountsAPI, customersAPI, locationsAPI, projectsAPI, reportingTagsAPI, settingsAPI, taxesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";

const safeReadLocalArray = (keys: string[]) => {
    for (const k of keys) {
        try {
            const raw = localStorage.getItem(k);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch { }
    }
    return [];
};

const getInitialLocations = () => safeReadLocalArray(["taban_locations_cache"]);
const getInitialTaxes = () => safeReadLocalArray(["taban_settings_taxes_v1", "taban_books_taxes"]);
const getInitialCurrencies = () => safeReadLocalArray(["taban_currencies", "taban_books_currencies"]);
const getStoredMileagePreferences = () => {
    try {
        const raw = localStorage.getItem("taban_mileage_preferences_v1");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const initialStoredMileagePreferences = getStoredMileagePreferences();
const initialStoredMileageUnit =
    initialStoredMileagePreferences?.defaultUnit === "Mile" || initialStoredMileagePreferences?.defaultUnit === "Mile(s)"
        ? "Mile(s)"
        : "Km";

const getInitialMileageRateValue = () => {
    try {
        const prefs = getStoredMileagePreferences();
        const rows = Array.isArray(prefs?.mileageRates) ? prefs.mileageRates : [];
        const defaultRateRow = rows.find((row: any) => !String(row?.startDate ?? "").trim() && Number.isFinite(parseFloat(String(row?.rate ?? "").trim())));
        const parsed = defaultRateRow ? parseFloat(String(defaultRateRow.rate ?? "").trim()) : NaN;
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
};

const createMileageRateRow = (startDate = "", rate = "", isDraft = false) => ({
    startDate,
    rate,
    isDraft,
});

const formatMileageRateDateLabel = (value: string) => {
    const text = String(value || "").trim();
    if (!text) return "";

    const direct = new Date(text);
    if (!Number.isNaN(direct.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(direct);
    }

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const month = Number(slashMatch[1]) - 1;
        const day = Number(slashMatch[2]);
        const year = Number(slashMatch[3]);
        const parsed = new Date(year, month, day);
        if (!Number.isNaN(parsed.getTime())) {
            return new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            }).format(parsed);
        }
    }

    return text;
};

type RecordMileageProps = {
    onClose?: () => void;
};

export default function RecordMileage({ onClose }: RecordMileageProps) {
    const { code: baseCurrencyCode } = useCurrency();
    const location = useLocation() as { state?: { receiptFiles?: any[] } };
    const defaultMileageAccountRef = useRef<HTMLDivElement>(null);
    const [defaultMileageAccountOpen, setDefaultMileageAccountOpen] = useState(false);
    const handleClose = () => {
        if (onClose) {
            onClose();
            return;
        }
        window.history.back();
    };
    const initialLocationsCache = getInitialLocations();
    const initialTaxesCache = getInitialTaxes();
    const initialCurrenciesCache = getInitialCurrencies();
    const initialLocationName = String(
        initialLocationsCache[0]?.name ||
        initialLocationsCache[0]?.locationName ||
        initialLocationsCache[0]?.location_name ||
        "Head Office"
    ).trim() || "Head Office";
    const initialCurrencyCode = String(
        initialCurrenciesCache.find((c: any) => c?.isBaseCurrency || c?.is_base_currency || c?.isBase)?.code ||
        initialCurrenciesCache[0]?.code ||
        baseCurrencyCode ||
        "USD"
    ).trim();

    const [formData, setFormData] = useState({
        location: initialLocationName,
        date: (() => {
            const today = new Date();
            const d = String(today.getDate()).padStart(2, "0");
            const m = String(today.getMonth() + 1).padStart(2, "0");
            const y = today.getFullYear();
            return `${d}/${m}/${y}`;
        })(),
        currency: initialCurrencyCode,
        calculateBy: "distance",
        startReading: "",
        endReading: "",
        distance: "",
        distanceUnit: initialStoredMileageUnit,
        amount: "0.00",
        taxType: "Tax Exclusive",
        tax: "",
        reference: "",
        notes: "",
        customerName: "",
        customerId: "",
        billable: false,
        projects: "None",
        projectId: "",
        markupBy: "1",
        markupType: "%",
        defaultMileageAccount: "Automobile Expense",
        selectedAccount: "Fuel/Mileage Expenses",
        reportingTags: [] as any[],
    });
    const [locations, setLocations] = useState<any[]>(() => initialLocationsCache);
    const [taxes, setTaxes] = useState<any[]>(() => getInitialTaxes());
    const [customers, setCustomers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [reportingTagDefinitions, setReportingTagDefinitions] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const locationRef = useRef<HTMLDivElement>(null);
    const [locationOpen, setLocationOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const taxRef = useRef<HTMLDivElement>(null);
    const [taxOpen, setTaxOpen] = useState(false);
    const [taxSearch, setTaxSearch] = useState("");
    const customerRef = useRef<HTMLDivElement>(null);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
    const reportingTagsRef = useRef<HTMLDivElement>(null);
    const [reportingTagOpenKey, setReportingTagOpenKey] = useState<string | null>(null);
    const [reportingTagErrors, setReportingTagErrors] = useState<Record<string, string>>({});
    const [odometerError, setOdometerError] = useState("");

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (defaultMileageAccountRef.current && !defaultMileageAccountRef.current.contains(event.target as Node)) {
                setDefaultMileageAccountOpen(false);
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (reportingTagsRef.current && !reportingTagsRef.current.contains(event.target as Node)) {
                setReportingTagOpenKey(null);
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);

    useEffect(() => {
        let alive = true;

        const applyPreferences = (prefs: any) => {
            if (!prefs || typeof prefs !== "object") return false;

            const normalizedAccount = String(prefs.defaultMileageAccount || "").trim() || "Automobile Expense";
            const normalizedUnit = prefs.defaultUnit === "Mile" || prefs.defaultUnit === "Mile(s)" ? "Mile(s)" : "Km";
            const normalizedRates = Array.isArray(prefs.mileageRates) && prefs.mileageRates.length > 0
                ? prefs.mileageRates.map((row: any) => ({
                    startDate: String(row?.startDate || ""),
                    rate: String(row?.rate || ""),
                }))
                : [{ startDate: "", rate: "" }];

            setFormData((prev) => ({ ...prev, defaultMileageAccount: normalizedAccount, distanceUnit: normalizedUnit }));
            setDefaultUnit(normalizedUnit);
            setMileageRates([
                ...normalizedRates.map((row) => createMileageRateRow(row.startDate, row.rate, false)),
                createMileageRateRow("", "", true),
            ]);

            const resolvedRate = getMileageRateForDateFromRows(normalizedRates, formData.date);
            if (resolvedRate !== null) {
                setMileageRate(resolvedRate);
                setTempRate(String(resolvedRate));
                setShowMileageRateLine(true);
            } else {
                setMileageRate(0);
                setTempRate("0");
                setShowMileageRateLine(false);
            }

            localStorage.setItem("mileage_preferences_set", "true");
            localStorage.setItem(
                "taban_mileage_preferences_v1",
                JSON.stringify({
                    defaultMileageAccount: normalizedAccount,
                    defaultUnit: normalizedUnit,
                    mileageRates: normalizedRates,
                })
            );
            setShowPreferencesModal(false);
            return true;
        };

        const loadPreferences = async () => {
            try {
                const response = await settingsAPI.getOrganizationProfile();
                if (!alive) return;
                if (applyPreferences(response?.data?.mileagePreferences)) return;
            } catch {
                // fall back below
            }

            if (!alive) return;
            if (applyPreferences(getStoredMileagePreferences())) return;
            setShowPreferencesModal(localStorage.getItem("mileage_preferences_set") !== "true");
        };

        void loadPreferences();
        return () => {
            alive = false;
        };
    }, []);

    const LIST_1_DEFAULT_ACCOUNTS = [
        "Office Supplies",
        "Advertising And Marketing",
        "Bank Fees and Charges",
        "Credit Card Charges",
        "Travel Expense",
        "Telephone Expense",
        "Automobile Expense",
        "IT and Internet Expenses",
        "Rent Expense"
    ];

    const LIST_2_FORM_ACCOUNTS = [
        "Janitorial Expense",
        "Postage",
        "Bad Debt",
        "Printing and Stationery",
        "Salaries and Employee Wages",
        "Meals and Entertainment",
        "Depreciation Expense",
        "Consultant Expense",
        "Repairs and Maintenance",
        "Other Expenses",
        "Lodging",
        "Purchase Discounts",
        "Fuel/Mileage Expenses"
    ];

    const normalizeText = (value: any) => String(value ?? "").trim();
    const getLocationName = (location: any) =>
        normalizeText(
            location?.name ||
            location?.locationName ||
            location?.location_name ||
            location?.branchName ||
            location?.displayName
        );
    const getTaxId = (tax: any) => normalizeText(tax?._id || tax?.id || tax?.tax_id || tax?.taxId);
    const getTaxName = (tax: any) =>
        normalizeText(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title);
    const isTaxActive = (tax: any) => tax?.isActive !== false && tax?.is_active !== false && tax?.status !== "inactive";
    const getTaxRate = (tax: any) => {
        const raw = tax?.rate ?? tax?.taxRate ?? tax?.percentage ?? tax?.tax_percentage ?? 0;
        const value = Number(raw);
        return Number.isFinite(value) ? value : 0;
    };
    const getCustomerId = (customer: any) => normalizeText(customer?._id || customer?.id);
    const getCustomerName = (customer: any) =>
        normalizeText(customer?.displayName || customer?.name || customer?.companyName);
    const getProjectId = (project: any) => normalizeText(project?._id || project?.id || project?.projectId);
    const getProjectName = (project: any) => normalizeText(project?.name || project?.projectName || project?.title);
    const getProjectCustomerId = (project: any) => {
        const rawCustomer = project?.customer_id || project?.customerId || project?.customer;
        if (rawCustomer && typeof rawCustomer === "object") {
            return normalizeText(rawCustomer?._id || rawCustomer?.id);
        }
        return normalizeText(rawCustomer);
    };

    const locationOptions = useMemo(() => {
        const names = Array.from(new Set((locations || []).map((loc: any) => getLocationName(loc)).filter(Boolean)));
        return names.length > 0 ? names : ["Head Office"];
    }, [locations]);
    const filteredLocationOptions = useMemo(() => {
        return locationOptions.filter((loc) => loc.toLowerCase().includes(locationSearch.toLowerCase()));
    }, [locationOptions, locationSearch]);
    const taxOptions = useMemo(() => {
        const rows = (Array.isArray(taxes) ? taxes : []).filter((tax: any) => isTaxActive(tax));
        return rows
            .map((tax: any) => ({
                id: getTaxId(tax),
                name: getTaxName(tax),
                rate: getTaxRate(tax),
                isGroup:
                    tax?.isGroup === true ||
                    String(tax?.kind || "").toLowerCase() === "group" ||
                    String(tax?.type || "").toLowerCase() === "group" ||
                    tax?.description === "__taban_tax_group__" ||
                    (Array.isArray(tax?.groupTaxes) && tax.groupTaxes.length > 0),
                isCompound: Boolean(tax?.isCompound),
            }))
            .filter((row) => row.id && row.name);
    }, [taxes]);
    const taxOptionGroups = useMemo(() => {
        const taxRows: any[] = [];
        const compoundRows: any[] = [];
        const groupRows: any[] = [];

        taxOptions.forEach((tax) => {
            if (tax.isGroup) {
                groupRows.push(tax);
            } else if (tax.isCompound) {
                compoundRows.push(tax);
            } else {
                taxRows.push(tax);
            }
        });

        return [
            { label: "Tax", options: taxRows },
            { label: "Compound tax", options: compoundRows },
            { label: "Tax Group", options: groupRows },
        ].filter((group) => group.options.length > 0);
    }, [taxOptions]);
    const filteredTaxGroups = useMemo(() => {
        const keyword = taxSearch.toLowerCase();
        return taxOptionGroups
            .map((group) => ({
                ...group,
                options: group.options.filter((tax: any) => `${tax.name} [${tax.rate}%]`.toLowerCase().includes(keyword)),
            }))
            .filter((group) => group.options.length > 0);
    }, [taxOptionGroups, taxSearch]);
    const selectedTaxOption = useMemo(
        () => taxOptions.find((tax) => tax.id === String(formData.tax || "")),
        [taxOptions, formData.tax]
    );
    const customerOptions = useMemo(() => {
        return (Array.isArray(customers) ? customers : [])
            .map((customer: any) => ({
                id: getCustomerId(customer),
                name: getCustomerName(customer),
                email: normalizeText(customer?.email),
                company: normalizeText(customer?.companyName || customer?.company || customer?.businessName || customer?.displayName || customer?.name),
                customerNo: normalizeText(customer?.customerNumber || customer?.customer_number || customer?.number || customer?.code),
            }))
            .filter((row) => row.id && row.name);
    }, [customers]);
    const filteredCustomerOptions = useMemo(() => {
        const keyword = customerSearch.toLowerCase();
        return customerOptions.filter((customer) => customer.name.toLowerCase().includes(keyword));
    }, [customerOptions, customerSearch]);
    const selectedCustomerOption = useMemo(
        () => customerOptions.find((customer) => customer.id === String(formData.customerId || "")),
        [customerOptions, formData.customerId]
    );
    const projectOptions = useMemo(() => {
        const selectedCustomerId = normalizeText(formData.customerId);
        const rows = (Array.isArray(projects) ? projects : []).map((project: any) => ({
            id: getProjectId(project),
            name: getProjectName(project),
            customerId: getProjectCustomerId(project),
        })).filter((row) => row.id && row.name);
        if (!selectedCustomerId) return rows;
        return rows.filter((row) => row.customerId === selectedCustomerId);
    }, [projects, formData.customerId]);

    const loadReportingTags = async () => {
        try {
            const response = await reportingTagsAPI.getAll();
            const rows = Array.isArray(response) ? response : (response?.data || []);
            const activeRows = rows.filter((tag: any) => tag?.isActive !== false && tag?.is_active !== false);
            const tagsToUse = (activeRows.length > 0 ? activeRows : rows).map((tag: any) => {
                const rawOptions = Array.isArray(tag?.options) ? tag.options : Array.isArray(tag?.values) ? tag.values : [];
                const options = rawOptions
                    .map((option: any) => typeof option === "string" ? option.trim() : String(option?.value || option?.label || option?.name || "").trim())
                    .filter(Boolean);
                return {
                    tagId: String(tag?._id || tag?.id || tag?.tagId || tag?.name || ""),
                    tagName: String(tag?.name || tag?.tagName || tag?.title || "Reporting Tag"),
                    isMandatory: Boolean(tag?.isMandatory || tag?.mandatory),
                    options,
                };
            }).filter((row: any) => row.tagId);

            setReportingTagDefinitions(tagsToUse);
            setFormData((prev) => ({
                ...prev,
                reportingTags: tagsToUse.map((tag: any) => {
                    const existing = (prev.reportingTags || []).find((rt: any) => String(rt?.tagId || rt?.id) === tag.tagId);
                    return {
                        tagId: tag.tagId,
                        id: tag.tagId,
                        name: tag.tagName,
                        isMandatory: tag.isMandatory,
                        options: tag.options,
                        value: existing?.value || "",
                    };
                }),
            }));
        } catch (error) {
            console.error("Error loading reporting tags:", error);
            setReportingTagDefinitions([]);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [locationsResponse, taxesResponse, customersResponse, projectsResponse, accountsResponse] = await Promise.all([
                    locationsAPI.getAll(),
                    taxesAPI.getAll({ limit: 1000 }),
                    customersAPI.getAll({ limit: 1000 }),
                    projectsAPI.getAll(),
                    chartOfAccountsAPI.getAccounts({ isActive: true }),
                ]);

                const locationRows = Array.isArray(locationsResponse?.data)
                    ? locationsResponse.data
                    : Array.isArray(locationsResponse?.locations)
                        ? locationsResponse.locations
                        : Array.isArray(locationsResponse)
                            ? locationsResponse
                            : [];
                setLocations(locationRows.length > 0 ? locationRows : initialLocationsCache);

                const taxRows = Array.isArray(taxesResponse?.data)
                    ? taxesResponse.data
                    : Array.isArray(taxesResponse)
                        ? taxesResponse
                        : initialTaxesCache;
                const activeTaxes = taxRows.filter((tax: any) => tax?.isActive !== false && tax?.is_active !== false);
                setTaxes(activeTaxes.length > 0 ? activeTaxes : taxRows);

                if (customersResponse?.success && Array.isArray(customersResponse?.data)) {
                    setCustomers(filterActiveRecords(customersResponse.data));
                } else {
                    setCustomers([]);
                }

                if (projectsResponse?.success && Array.isArray(projectsResponse?.data)) {
                    setProjects(projectsResponse.data);
                } else {
                    setProjects([]);
                }

                if (accountsResponse?.success && Array.isArray(accountsResponse?.data)) {
                    setAccounts(filterActiveRecords(accountsResponse.data));
                } else {
                    setAccounts([]);
                }
            } catch (error) {
                console.error("Error loading mileage form data:", error);
            }
        };

        loadData();
        void loadReportingTags();
    }, []);

    const reloadCustomersForMileage = async () => {
        try {
            const customersResponse = await customersAPI.getAll({ limit: 1000 });
            if (customersResponse?.success && Array.isArray(customersResponse?.data)) {
                setCustomers(filterActiveRecords(customersResponse.data));
            } else {
                setCustomers([]);
            }
        } catch (error) {
            console.error("Error reloading customers:", error);
        }
    };

    const validateMandatoryReportingTags = () => {
        const nextErrors: Record<string, string> = {};

        (Array.isArray(formData.reportingTags) ? formData.reportingTags : []).forEach((tag: any, index: number) => {
            const key = String(tag?.tagId || tag?.id || tag?.name || index);
            const isMandatory = Boolean(tag?.isMandatory || tag?.mandatory);
            const value = String(tag?.value ?? "").trim();

            if (isMandatory && !value) {
                nextErrors[key] = "This field is required.";
            }
        });

        setReportingTagErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleFooterSave = () => {
        const tagsValid = validateMandatoryReportingTags();

        let odometerValid = true;
        if (formData.calculateBy === "odometer") {
            const start = String(formData.startReading || "").trim();
            const end = String(formData.endReading || "").trim();

            if (!start || !end) {
                setOdometerError("Both start and end readings are required.");
                odometerValid = false;
            } else if (Number(end) <= Number(start)) {
                setOdometerError("End reading must be greater than start reading.");
                odometerValid = false;
            } else {
                setOdometerError("");
            }
        } else {
            setOdometerError("");
        }

        if (!tagsValid || !odometerValid) {
            if (!tagsValid && !odometerValid) {
                toast.error("Please fill all mandatory reporting tags and odometer readings.");
            } else if (!tagsValid) {
                toast.error("Please fill all mandatory reporting tags.");
            } else {
                toast.error("Please complete the odometer readings correctly.");
            }
            return;
        }
        toast.success("Reporting tags are valid.");
    };

    useEffect(() => {
        setFormData((prev) => {
            const currentLocation = normalizeText(prev.location);
            const nextLocation = currentLocation && locationOptions.includes(currentLocation)
                ? currentLocation
                : (locationOptions[0] || "Head Office");
            return { ...prev, location: nextLocation };
        });
    }, [locationOptions]);

    useEffect(() => {
        if (!baseCurrencyCode) return;
        setFormData((prev) => ({
            ...prev,
            currency: baseCurrencyCode,
        }));
    }, [baseCurrencyCode]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (locationRef.current && !locationRef.current.contains(target)) {
                setLocationOpen(false);
                setLocationSearch("");
            }
            if (taxRef.current && !taxRef.current.contains(target)) {
                setTaxOpen(false);
                setTaxSearch("");
            }
            if (customerRef.current && !customerRef.current.contains(target)) {
                setCustomerOpen(false);
                setCustomerSearch("");
            }
        };

        if (locationOpen || taxOpen || customerOpen) {
            document.addEventListener("mousedown", handleOutside);
        }
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [locationOpen, taxOpen, customerOpen]);

    const expenseAccountOptions = useMemo(() => {
        const fromApi = (Array.isArray(accounts) ? accounts : [])
            .filter((account: any) => {
                const type = String(account?.accountType || "").toLowerCase();
                return account?.isActive !== false && (
                    type.includes("expense") ||
                    type === "cost_of_goods_sold" ||
                    type === "other_expense"
                );
            })
            .map((account: any) => String(account?.accountName || "").trim())
            .filter(Boolean);
        const unique = Array.from(new Set([...fromApi, ...LIST_2_FORM_ACCOUNTS]));
        return unique.length > 0 ? unique : LIST_2_FORM_ACCOUNTS;
    }, [accounts]);

    const defaultAccountOptions = useMemo(() => {
        const unique = Array.from(new Set([...expenseAccountOptions, ...LIST_1_DEFAULT_ACCOUNTS]));
        return unique.length > 0 ? unique : LIST_1_DEFAULT_ACCOUNTS;
    }, [expenseAccountOptions]);

    const [showPreferencesModal, setShowPreferencesModal] = useState(() => {
        return !getStoredMileagePreferences() && localStorage.getItem("mileage_preferences_set") !== "true";
    });

    const [mileageRates, setMileageRates] = useState([
        createMileageRateRow("", "", true)
    ]);
    const [defaultUnit, setDefaultUnit] = useState<"Km" | "Mile(s)">(initialStoredMileageUnit);

    const [mileageRate, setMileageRate] = useState(getInitialMileageRateValue());

    useEffect(() => {
        const receiptFiles = location?.state?.receiptFiles;
        if (Array.isArray(receiptFiles) && receiptFiles.length > 0) {
            setUploadedFiles(receiptFiles);
        }
    }, [location?.state?.receiptFiles]);
    const [showRatePopover, setShowRatePopover] = useState(false);
    const [tempRate, setTempRate] = useState(() => String(getInitialMileageRateValue()));
    const [showMileageRateLine, setShowMileageRateLine] = useState(() => getInitialMileageRateValue() > 0);

    const getFileExtension = (name: string) => {
        const parts = String(name || "").split(".");
        return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
    };

    const isImageUpload = (fileRow: any) => {
        const mime = String(fileRow?.type || "").toLowerCase();
        const ext = getFileExtension(String(fileRow?.name || ""));
        const imageExts = new Set(["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tif", "tiff", "jfif"]);
        return mime.startsWith("image/") || imageExts.has(ext);
    };

    const getDocumentTypeLabel = (fileRow: any) => {
        const mime = String(fileRow?.type || "").toLowerCase();
        const ext = getFileExtension(String(fileRow?.name || ""));
        if (mime.includes("pdf") || ext === "pdf") return "PDF";
        if (mime.includes("word") || ext === "doc" || ext === "docx") return "DOC";
        if (mime.includes("excel") || ext === "xls" || ext === "xlsx") return "XLS";
        if (mime.includes("csv") || ext === "csv") return "CSV";
        if (mime.includes("text") || ext === "txt") return "TXT";
        if (ext) return ext.toUpperCase();
        return "FILE";
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const validFiles = files.filter((file) => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 10MB limit. Maximum file size is 10MB.`);
                return false;
            }
            return true;
        });
        const newFiles = validFiles.map((file) => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file,
        }));
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveFile = (fileId: number) => {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    };

    useEffect(() => {
        const first = uploadedFiles[0];
        if (!first || !first.file || !isImageUpload(first)) {
            setUploadedPreviewUrl("");
            return;
        }
        const objectUrl = URL.createObjectURL(first.file);
        setUploadedPreviewUrl(objectUrl);
        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [uploadedFiles]);

    const calculateAmount = (dist: string, rate: number) => {
        const d = parseFloat(dist);
        if (isNaN(d)) return "0.00";
        return (d * rate).toFixed(2);
    };

    const parseDisplayDate = (value: string) => {
        const text = String(value || "").trim();
        if (!text) return null;

        const direct = new Date(text);
        if (!Number.isNaN(direct.getTime())) {
            return new Date(direct.getFullYear(), direct.getMonth(), direct.getDate());
        }

        const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            const first = Number(slashMatch[1]);
            const second = Number(slashMatch[2]);
            const year = Number(slashMatch[3]);
            const monthIndex = first > 12 ? second - 1 : first - 1;
            const day = first > 12 ? first : second;
            const parsed = new Date(year, monthIndex, day);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        return null;
    };

    const getMileageRateForDateFromRows = (rows: Array<{ startDate: string; rate: string }>, dateText: string): number | null => {
        const targetDate = parseDisplayDate(dateText);
        let defaultRate: number | null = null;
        const datedRates: Array<{ startDate: Date; rate: number }> = [];

        rows.forEach((row) => {
            const rateValue = parseFloat(String(row?.rate ?? "").trim());
            if (Number.isNaN(rateValue)) return;

            const startText = String(row?.startDate || "").trim();
            if (!startText) {
                defaultRate = rateValue;
                return;
            }

            const startDate = parseDisplayDate(startText);
            if (!startDate) return;
            datedRates.push({ startDate, rate: rateValue });
        });

        datedRates.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        if (!targetDate) return defaultRate;

        let matched: number | null = null;
        for (const row of datedRates) {
            if (row.startDate.getTime() <= targetDate.getTime()) {
                matched = row.rate;
            } else {
                break;
            }
        }

        if (matched !== null) return matched;
        if (defaultRate !== null) return defaultRate;
        return null;
    };

    const getMileageRateForDate = (dateText: string): number | null => getMileageRateForDateFromRows(mileageRates, dateText);

    const handleSavePreferences = async () => {
        const persistedRates = mileageRates
            .map((row) => ({
                startDate: String(row?.startDate || "").trim(),
                rate: String(row?.rate || "").trim(),
            }))
            .filter((row) => row.startDate || row.rate);

        const savedPreferences = {
            defaultMileageAccount: String(formData.defaultMileageAccount || "").trim() || "Automobile Expense",
            defaultUnit,
            mileageRates: persistedRates,
        };

        localStorage.setItem("mileage_preferences_set", "true");
        localStorage.setItem("taban_mileage_preferences_v1", JSON.stringify(savedPreferences));

        try {
            await settingsAPI.updateOrganizationProfile({ mileagePreferences: savedPreferences });
        } catch (error) {
            console.error("Error saving mileage preferences:", error);
        }

        const resolvedRate = getMileageRateForDate(formData.date);
        if (resolvedRate !== null) {
            setMileageRate(resolvedRate);
            setTempRate(String(resolvedRate));
            setFormData((prev) => ({
                ...prev,
                distanceUnit: defaultUnit,
                amount: calculateAmount(prev.distance, resolvedRate),
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                distanceUnit: defaultUnit,
            }));
        }
        setMileageRates([
            ...persistedRates.map((row) => createMileageRateRow(row.startDate, row.rate, false)),
            createMileageRateRow("", "", true),
        ]);
        setShowPreferencesModal(false);
    };

    if (showPreferencesModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto pt-4 pb-6">
                <div className="bg-white rounded-lg shadow-xl w-[650px] max-w-[calc(100vw-24px)] overflow-hidden mt-1">
                    <div className="flex justify-between items-center px-6 pt-5 pb-2">
                        <h2 className="text-xl text-red-500 font-normal">Set your mileage preferences</h2>
                        <button className="text-gray-400 hover:text-gray-600" onClick={handleClose}>✕</button>
                    </div>

                    <div className="px-6 pb-6 pt-3">
                        <div className="mb-5 flex items-center">
                            <label className="w-40 text-gray-700 text-sm leading-5">Default Mileage Account</label>
                            <div ref={defaultMileageAccountRef} className="relative flex-1 max-w-[250px]">
                                <button
                                    type="button"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-left text-sm flex items-center justify-between bg-white focus:outline-none focus:border-[#156372]"
                                    onClick={() => setDefaultMileageAccountOpen((prev) => !prev)}
                                >
                                    <span className="truncate">{formData.defaultMileageAccount || "Select an account"}</span>
                                    {defaultMileageAccountOpen ? (
                                        <ChevronUp size={16} className="text-gray-400 shrink-0" />
                                    ) : (
                                        <ChevronDown size={16} className="text-gray-400 shrink-0" />
                                    )}
                                </button>
                                {defaultMileageAccountOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[180px] overflow-y-auto custom-scrollbar">
                                        {defaultAccountOptions.map((opt) => {
                                            const isSelected = formData.defaultMileageAccount === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                                        isSelected ? "bg-[#e8f4f3] text-[#156372] font-medium" : "text-gray-700"
                                                    }`}
                                                    onClick={() => {
                                                        setFormData({ ...formData, defaultMileageAccount: opt });
                                                        setDefaultMileageAccountOpen(false);
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-7 flex items-center">
                            <label className="w-40 text-gray-700 text-sm">Default Unit</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="unit"
                                            className="h-4 w-4 accent-[#156372]"
                                            checked={defaultUnit === "Km"}
                                            onChange={() => {
                                                setDefaultUnit("Km");
                                                setFormData((prev) => ({ ...prev, distanceUnit: "Km" }));
                                            }}
                                        />
                                    <span className="text-sm">Km</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="unit"
                                            className="h-4 w-4 accent-[#156372]"
                                            checked={defaultUnit === "Mile(s)"}
                                            onChange={() => {
                                                setDefaultUnit("Mile(s)");
                                                setFormData((prev) => ({ ...prev, distanceUnit: "Mile(s)" }));
                                            }}
                                        />
                                    <span className="text-sm">Mile</span>
                                </label>
                            </div>
                        </div>

                        <div className="mb-2 uppercase text-gray-600 text-sm font-semibold tracking-wider">MILEAGE RATES</div>
                        <p className="text-gray-500 text-sm mb-5 leading-relaxed max-w-[560px]">
                            Any mileage expense recorded on or after the start date will have the corresponding mileage rate. You can create a default rate (created without specifying a date), which will be applicable for mileage expenses recorded before the initial start date.
                        </p>

                        <table className="w-full text-left border-collapse mb-4">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">START DATE</th>
                                    <th className="py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">MILEAGE RATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mileageRates.map((rateRow, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 px-2">
                                            {rateRow.isDraft ? (
                                                <DatePicker
                                                    value={rateRow.startDate}
                                                    onChange={(date) => {
                                                        const next = [...mileageRates];
                                                        next[idx].startDate = date;
                                                        setMileageRates(next);
                                                    }}
                                                    placeholder="dd MMM yyyy"
                                                />
                                            ) : (
                                                <span className="text-sm text-gray-900">{formatMileageRateDateLabel(rateRow.startDate)}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            {rateRow.isDraft ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center border border-gray-300 rounded w-36 overflow-hidden focus-within:border-[#156372]">
                                                        <span className="bg-white px-3 py-1.5 text-sm text-gray-600 border-r border-gray-300">{formData.currency || baseCurrencyCode || "USD"}</span>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1.5 text-sm outline-none"
                                                            value={rateRow.rate}
                                                            onChange={(e) => {
                                                                const next = [...mileageRates];
                                                                next[idx].rate = e.target.value;
                                                                setMileageRates(next);
                                                            }}
                                                        />
                                                    </div>
                                                    {mileageRates.length > 1 && (
                                                        <button
                                                            type="button"
                                                            aria-label="Remove mileage rate"
                                                            onClick={() => {
                                                                setMileageRates((prev) => prev.filter((_, i) => i !== idx));
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-900">
                                                    {(formData.currency || baseCurrencyCode || "USD")}{rateRow.rate}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <button
                            type="button"
                            className="text-[#156372] font-medium text-sm flex items-center gap-1 hover:text-[#0d4a52]"
                            onClick={() => setMileageRates([...mileageRates, createMileageRateRow("", "", true)])}
                        >
                            <PlusCircle size={16} className="shrink-0" />
                            <span>Add Mileage Rate</span>
                        </button>
                    </div>

                    <div className="px-6 pb-6 pt-0 border-t border-gray-100/0 mt-4 flex gap-3">
                        <button className="bg-[#156372] hover:bg-[#0f4a56] text-white px-4 py-2 rounded font-medium text-sm" onClick={handleSavePreferences}>
                            Save
                        </button>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded font-medium text-sm" onClick={handleClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-[calc(100vh-140px)] flex">
            {/* Left Form Area */}
            <div className="flex-1 max-w-[800px] p-6 pr-12 pb-32">
                <form className="space-y-6">
                    <div className="flex">
                        <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Location</label>
                        <div className="relative w-full" ref={locationRef}>
                            <button
                                type="button"
                                onClick={() => setLocationOpen((prev) => !prev)}
                                className="w-full rounded-md border border-[#156372] bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            >
                                <span className={formData.location ? "text-gray-900" : "text-gray-400"}>
                                    {formData.location || "Select location"}
                                </span>
                                {locationOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-[#156372]" />}
                            </button>
                            {locationOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#156372] rounded-md shadow-lg z-50">
                                    <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            type="text"
                                            value={locationSearch}
                                            onChange={(e) => setLocationSearch(e.target.value)}
                                            placeholder="Search"
                                            className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto py-1">
                                        {filteredLocationOptions.map((loc) => {
                                            const selected = formData.location === loc;
                                            return (
                                                <button
                                                    key={loc}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, location: loc });
                                                        setLocationOpen(false);
                                                        setLocationSearch("");
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-sm ${selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"}`}
                                                >
                                                    {loc}
                                                </button>
                                            );
                                        })}
                                        {filteredLocationOptions.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex">
                        <label className="w-[200px] text-sm text-[#ff4b4b] py-1.5 font-medium shrink-0">Date*</label>
                        <div className="w-full">
                            <DatePicker
                                value={formData.date}
                                onChange={(date) => {
                                    const resolvedRate = getMileageRateForDate(date);
                                    if (resolvedRate === null) {
                                        toast.error("The mileage rate has not been defined for the specified date. Please add a mileage rate in settings");
                                        setMileageRate(0);
                                        setTempRate("0");
                                        setShowMileageRateLine(false);
                                        setFormData((prev) => ({
                                            ...prev,
                                            date,
                                            amount: "0.00",
                                        }));
                                    } else {
                                        setMileageRate(resolvedRate);
                                        setTempRate(String(resolvedRate));
                                        setShowMileageRateLine(true);
                                        setFormData((prev) => ({
                                            ...prev,
                                            date,
                                            amount: calculateAmount(prev.distance, resolvedRate),
                                        }));
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex">
                        <label className="w-[200px] text-sm text-[#ff4b4b] py-1 font-medium shrink-0 leading-tight pt-1">Calculate mileage<br />using*</label>
                        <div className="w-full flex items-center gap-6 pt-1.5">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800 font-medium">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="calcMethod"
                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#156372] checked:bg-[#156372] transition-all"
                                        checked={formData.calculateBy === "distance"}
                                        onChange={() => setFormData({ ...formData, calculateBy: "distance" })}
                                    />
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                                </div>
                                Distance travelled
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="calcMethod"
                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#156372] checked:bg-[#156372] transition-all"
                                        checked={formData.calculateBy === "odometer"}
                                        onChange={() => setFormData({ ...formData, calculateBy: "odometer" })}
                                    />
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                                </div>
                                Odometer reading
                            </label>
                        </div>
                    </div>

                    {formData.calculateBy === "odometer" && (
                        <div className="flex">
                            <label className="w-[200px] text-sm text-[#ff4b4b] py-1.5 font-medium shrink-0">Odometer reading*</label>
                            <div className="w-full flex items-center gap-4">
                                <input
                                    type="number"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                    placeholder="Start reading"
                                    value={formData.startReading}
                                    onChange={(e) => {
                                        const start = e.target.value;
                                        const endVal = formData.endReading;
                                        const dist = endVal && start ? Number(endVal) - Number(start) : 0;
                                        const finalDist = dist > 0 ? dist.toFixed(1) : "";
                                        setOdometerError("");
                                        setFormData({
                                            ...formData,
                                            startReading: start,
                                            distance: finalDist,
                                            amount: calculateAmount(finalDist, mileageRate)
                                        });
                                    }}
                                />
                                <span className="text-sm text-gray-500 font-medium">To</span>
                                <input
                                    type="number"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                    placeholder="End reading"
                                    value={formData.endReading}
                                    onChange={(e) => {
                                        const end = e.target.value;
                                        const startVal = formData.startReading;
                                        const dist = end && startVal ? Number(end) - Number(startVal) : 0;
                                        const finalDist = dist > 0 ? dist.toFixed(1) : "";
                                        setOdometerError("");
                                        setFormData({
                                            ...formData,
                                            endReading: end,
                                            distance: finalDist,
                                            amount: calculateAmount(finalDist, mileageRate)
                                        });
                                    }}
                                />
                            </div>
                            {odometerError && (
                                <div className="ml-[200px] mt-1 text-xs text-red-500">{odometerError}</div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col">
                        <div className="flex">
                            <label className="w-[200px] text-sm text-[#ff4b4b] py-1.5 font-medium shrink-0">Distance*</label>
                            <div className="w-full flex border border-gray-300 rounded-md overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372] mr-8">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 text-sm outline-none border-none"
                                    placeholder="0"
                                    value={formData.distance}
                                    onChange={(e) => {
                                        const dist = e.target.value;
                                        setFormData({
                                            ...formData,
                                            distance: dist,
                                            amount: calculateAmount(dist, mileageRate)
                                        });
                                    }}
                                />
                                <div className="bg-[#f8fafc] border-l border-gray-300 px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                    {formData.distanceUnit === "Km" ? "Kilometer(s)" : "Mile(s)"}
                                </div>
                            </div>
                        </div>
                        {showMileageRateLine && (
                            <div className="ml-[200px] mt-1 flex items-center gap-1 text-xs text-gray-500 relative">
                                Rate per {formData.distanceUnit === "Km" ? "km" : "mile"} = {formData.currency || baseCurrencyCode || "USD"}{mileageRate.toFixed(2)}
                                <button
                                    type="button"
                                    className="text-[#156372] hover:underline"
                                    onClick={() => {
                                        setTempRate(String(mileageRate));
                                        setShowRatePopover(!showRatePopover);
                                    }}
                                >
                                    Change
                                </button>

                                {showRatePopover && (
                                    <div className="absolute top-full left-[160px] mt-2 z-50 bg-white rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.15)] border border-gray-200 w-[240px] p-5 text-left">
                                        {/* Triangle tip */}
                                        <div className="absolute -top-1.5 left-12 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45"></div>

                                        <div className="flex justify-between items-center mb-5">
                                            <h4 className="text-[15px] font-semibold text-gray-800">Edit Mileage Rate</h4>
                                            <button
                                                className="text-gray-400 hover:text-red-500 border border-gray-300 rounded p-0.5 flex items-center justify-center transition-colors"
                                                type="button"
                                                onClick={() => setShowRatePopover(false)}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>

                                        <div className="mb-5">
                                            <label className="block text-sm text-[#ff4b4b] font-medium mb-2">Mileage rate (in {formData.currency || baseCurrencyCode || "USD"})*</label>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                                value={tempRate}
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                        setTempRate(value);
                                                    }
                                                }}
                                                autoFocus
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="bg-[#22a06b] hover:bg-[#1d8a5d] text-white px-5 py-2 rounded font-medium text-sm transition-colors shadow-sm"
                                            onClick={() => {
                                                const newRate = parseFloat(tempRate);
                                                if (!isNaN(newRate)) {
                                                    setMileageRate(newRate);
                                                    setShowMileageRateLine(true);
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        amount: calculateAmount(prev.distance, newRate),
                                                    }));
                                                }
                                                setShowRatePopover(false);
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex">
                        <label className="w-[200px] text-sm text-[#ff4b4b] py-1.5 font-medium shrink-0">Amount*</label>
                        <div className="w-full flex border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372]">
                            <div className="min-w-[88px] bg-[#f8fafc] border-r border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 whitespace-nowrap text-center">
                                {formData.currency || baseCurrencyCode || "USD"}
                            </div>
                            <input
                                type="number"
                                className="w-full px-3 py-2 text-sm outline-none border-none bg-[#f8fafc] text-gray-500 placeholder:text-gray-400 cursor-not-allowed"
                                placeholder="0.00"
                                value={formData.amount}
                                readOnly
                                aria-readonly="true"
                            />
                        </div>
                    </div>

                    <div className="flex pt-1 pb-4 border-b border-gray-100">
                        <label className="w-[200px] text-sm text-gray-700 py-1 font-medium shrink-0">Amount Is</label>
                        <div className="w-full flex items-center gap-6 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="taxType"
                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#156372] checked:bg-[#156372] transition-all"
                                        checked={formData.taxType === "Tax Inclusive"}
                                        onChange={() => setFormData({ ...formData, taxType: "Tax Inclusive" })}
                                    />
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                                </div>
                                Tax Inclusive
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800 font-medium">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="taxType"
                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#156372] checked:bg-[#156372] transition-all"
                                        checked={formData.taxType === "Tax Exclusive"}
                                        onChange={() => setFormData({ ...formData, taxType: "Tax Exclusive" })}
                                    />
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                                </div>
                                Tax Exclusive
                            </label>
                        </div>
                    </div>

                    <div className="flex">
                        <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Tax</label>
                        <div className="relative w-full" ref={taxRef}>
                            <button
                                type="button"
                                onClick={() => setTaxOpen((prev) => !prev)}
                                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:ring-1 ${taxOpen ? "border-[#3b82f6] focus:border-[#3b82f6] focus:ring-[#3b82f6]" : "border-gray-300 focus:border-[#156372] focus:ring-[#156372]"}`}
                            >
                                <span className={selectedTaxOption ? "text-gray-900" : "text-gray-400"}>
                                    {selectedTaxOption ? `${selectedTaxOption.name} [${selectedTaxOption.rate}%]` : "Select a Tax"}
                                </span>
                                <span className="flex items-center">
                                    {selectedTaxOption && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormData((prev) => ({ ...prev, tax: "" }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setFormData((prev) => ({ ...prev, tax: "" }));
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-600 px-2"
                                        >
                                            <X size={14} />
                                        </span>
                                    )}
                                    {selectedTaxOption && <span className="h-5 w-px bg-gray-200" />}
                                    <span className="px-2">
                                        {taxOpen ? (
                                            <ChevronUp size={14} className="text-[#3b82f6]" />
                                        ) : (
                                            <ChevronDown size={14} className="text-gray-500" />
                                        )}
                                    </span>
                                </span>
                            </button>
                            {taxOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-sm z-50">
                                    <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            type="text"
                                            value={taxSearch}
                                            onChange={(e) => setTaxSearch(e.target.value)}
                                            placeholder="Search..."
                                            className="flex-1 rounded-md border border-[#3b82f6] px-2 py-1 text-sm outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto py-1">
                                        {filteredTaxGroups.map((group) => (
                                            <div key={group.label}>
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{group.label}</div>
                                                {group.options.map((tax: any) => {
                                                    const selected = String(formData.tax || "") === tax.id;
                                                    return (
                                                        <button
                                                            key={tax.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData((prev) => ({ ...prev, tax: tax.id }));
                                                                setTaxOpen(false);
                                                                setTaxSearch("");
                                                            }}
                                                            className={`w-full px-3 py-2 text-left text-sm ${selected
                                                                ? "bg-[#156372] text-white font-medium"
                                                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                                }`}
                                                        >
                                                            {tax.name} [{tax.rate}%]
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                        {filteredTaxGroups.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Add New Tax
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex">
                        <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Reference#</label>
                        <div className="w-full">
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex pb-6 border-b border-gray-100">
                        <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Notes</label>
                        <div className="w-full">
                            <textarea
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] resize-y"
                                placeholder="Max. 500 characters"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex pt-4 pb-4 border-b border-gray-100">
                        <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Customer Name</label>
                        <div className="w-full flex">
                            <div className="relative flex-1" ref={customerRef}>
                                <button
                                    type="button"
                                    onClick={() => setCustomerOpen((prev) => !prev)}
                                    className={`w-full rounded-l-md rounded-r-none border border-r-0 bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:ring-1 ${customerOpen ? "border-[#3b82f6] focus:border-[#3b82f6] focus:ring-[#3b82f6]" : "border-gray-300 focus:border-[#156372] focus:ring-[#156372]"}`}
                                >
                                    <span className={selectedCustomerOption ? "text-gray-900" : "text-gray-400"}>
                                        {selectedCustomerOption?.name || "Select or add a customer"}
                                    </span>
                                    <span className="flex items-center">
                                        {selectedCustomerOption && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        customerId: "",
                                                        customerName: "",
                                                        billable: false,
                                                        projectId: "",
                                                        projects: "None",
                                                    }));
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            customerId: "",
                                                            customerName: "",
                                                            billable: false,
                                                            projectId: "",
                                                            projects: "None",
                                                        }));
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-600 px-2"
                                            >
                                                <X size={14} />
                                            </span>
                                        )}
                                        {selectedCustomerOption && <span className="h-5 w-px bg-gray-200" />}
                                        <span className="px-2">
                                            {customerOpen ? (
                                                <ChevronUp size={14} className="text-[#3b82f6]" />
                                            ) : (
                                                <ChevronDown size={14} className="text-gray-500" />
                                            )}
                                        </span>
                                    </span>
                                </button>
                                {customerOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                        <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0">
                                            <Search size={14} className="text-gray-400" />
                                            <input
                                                type="text"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                placeholder="Search customers"
                                                className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[210px] overflow-y-auto p-2 space-y-1">
                                            {filteredCustomerOptions.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                                            ) : (
                                                filteredCustomerOptions.map((customer, index) => {
                                                    const selected = customer.id === String(formData.customerId || "");
                                                    return (
                                                        <button
                                                            key={`${customer.id}-${index}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    customerId: customer.id,
                                                                    customerName: customer.name,
                                                                    billable: false,
                                                                    projectId: "",
                                                                    projects: "None",
                                                                }));
                                                                setCustomerOpen(false);
                                                                setCustomerSearch("");
                                                            }}
                                                            className={`w-full rounded-md px-3 py-2 text-left ${selected ? "bg-gray-100 text-gray-900" : "text-gray-900 hover:bg-gray-100 hover:text-gray-900"}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${selected ? "bg-gray-200 text-gray-700" : "bg-[#e2e8f0] text-gray-700"}`}>
                                                                    {String(customer.name || "C").charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-medium truncate">
                                                                        {customer.name}{customer.customerNo ? ` | ${customer.customerNo}` : ""}
                                                                    </div>
                                                                    <div className={`text-xs truncate flex items-center gap-2 ${selected ? "text-gray-500" : "text-gray-500"}`}>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Mail size={12} />
                                                                            {customer.email || "-"}
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Building2 size={12} />
                                                                            {customer.company || "-"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#2563eb] hover:bg-[#f8fafc] flex items-center gap-2"
                                            onClick={() => {
                                                setCustomerQuickActionFrameKey((prev) => prev + 1);
                                                setNewCustomerModalOpen(true);
                                                setCustomerOpen(false);
                                            }}
                                        >
                                            <Plus size={14} />
                                            New Customer
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button type="button" className="bg-[#156372] hover:bg-[#0f4a56] text-white px-3 rounded-r-md border border-[#156372] flex items-center justify-center transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </button>
                            {formData.customerId && (
                                <label className="ml-3 flex items-center gap-1.5 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.billable}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, billable: e.target.checked }))}
                                        className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                                    />
                                    Billable
                                </label>
                            )}
                        </div>
                    </div>

                    {formData.customerId && (
                        <div className="flex pt-4 pb-4 border-b border-gray-100">
                            <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Projects</label>
                            <div className="relative w-full">
                                <select
                                    className="w-full rounded-md border border-gray-300 bg-[#f8fafc] px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] appearance-none text-gray-700"
                                    value={formData.projectId}
                                    onChange={(e) => {
                                        const projectId = e.target.value;
                                        const selected = projectOptions.find((row) => row.id === projectId);
                                        setFormData({
                                            ...formData,
                                            projectId,
                                            projects: selected?.name || "None",
                                        });
                                    }}
                                >
                                    <option value="">None</option>
                                    {projectOptions.map((project) => (
                                        <option key={project.id} value={project.id}>{project.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    )}

                    {formData.customerId && formData.billable && (
                        <div className="flex pb-4 border-b border-gray-100">
                            <label className="w-[200px] text-sm text-gray-700 py-1.5 font-medium shrink-0">Mark up by</label>
                            <div className="w-full max-w-[230px] flex border border-gray-300 rounded-md overflow-hidden">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.markupBy}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, markupBy: e.target.value }))}
                                    className="flex-1 px-3 py-2 text-sm outline-none border-none text-right"
                                />
                                <select
                                    value={formData.markupType}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, markupType: e.target.value }))}
                                    className="w-[58px] border-l border-gray-300 bg-[#f8fafc] text-sm px-2 outline-none"
                                >
                                    <option value="%">%</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div ref={reportingTagsRef} className="space-y-4 pt-4 pb-20">
                        {(formData.reportingTags || []).map((tag: any, index: number) => {
                            const tagKey = String(tag?.tagId || tag?.id || tag?.name || index);
                            const hasError = Boolean(reportingTagErrors[tagKey]);
                            const isMandatory = Boolean(tag?.isMandatory || tag?.mandatory);
                            const value = String(tag?.value ?? "").trim();
                            const options = Array.isArray(tag?.options) ? tag.options : [];
                            const isOpen = reportingTagOpenKey === tagKey;

                            return (
                                <div className="flex items-start gap-4" key={tagKey}>
                                    <label className={`w-[200px] text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isMandatory ? "text-[#ff4b4b]" : "text-gray-700"}`}>
                                        {tag?.name || "Reporting Tag"}{isMandatory ? "*" : ""}
                                    </label>
                                    <div className="relative w-full">
                                        <button
                                            type="button"
                                            onClick={() => setReportingTagOpenKey((prev) => (prev === tagKey ? null : tagKey))}
                                            className={`w-full rounded-md border bg-[#f8fafc] px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:ring-1 ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-gray-300 focus:border-[#156372] focus:ring-[#156372]"}`}
                                        >
                                            <span className="text-gray-700">{value || "None"}</span>
                                            <ChevronDown className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={16} />
                                        </button>
                                        {isOpen && (
                                            <div className="absolute left-0 right-0 z-20 mt-1 max-h-[210px] overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData((prev) => {
                                                            const nextTags = Array.isArray(prev.reportingTags) ? [...prev.reportingTags] : [];
                                                            nextTags[index] = { ...nextTags[index], value: "" };
                                                            return { ...prev, reportingTags: nextTags };
                                                        });
                                                        setReportingTagErrors((prev) => {
                                                            if (!prev[tagKey]) return prev;
                                                            const next = { ...prev };
                                                            delete next[tagKey];
                                                            return next;
                                                        });
                                                        setReportingTagOpenKey(null);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#f8fafc] transition-colors"
                                                >
                                                    None
                                                </button>
                                                {options.map((option: string) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev) => {
                                                                const nextTags = Array.isArray(prev.reportingTags) ? [...prev.reportingTags] : [];
                                                                nextTags[index] = { ...nextTags[index], value: option };
                                                                return { ...prev, reportingTags: nextTags };
                                                            });
                                                            setReportingTagErrors((prev) => {
                                                                if (!prev[tagKey]) return prev;
                                                                const next = { ...prev };
                                                                delete next[tagKey];
                                                                return next;
                                                            });
                                                            setReportingTagOpenKey(null);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#f8fafc] transition-colors"
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {hasError && isMandatory && !value && (
                                            <p className="mt-1 text-xs text-red-500">{reportingTagErrors[tagKey]}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {(!Array.isArray(formData.reportingTags) || formData.reportingTags.length === 0) && reportingTagDefinitions.length === 0 && (
                            <div className="text-sm text-gray-500 ml-[200px]">No reporting tags found.</div>
                        )}
                    </div>

                    {/* Action Footer */}
                    <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4 pl-[300px] flex gap-3 z-10">
                        <button type="button" onClick={handleFooterSave} className="bg-[#156372] hover:bg-[#0f4a56] text-white px-4 py-2 rounded font-medium text-sm flex items-center shadow-sm">
                            Save <span className="opacity-80 text-xs ml-1 font-normal">(Alt+S)</span>
                        </button>
                        <button type="button" onClick={handleFooterSave} className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded font-medium text-sm flex items-center shadow-sm">
                            Save and New <span className="opacity-60 text-xs ml-1 font-normal">(Alt+N)</span>
                        </button>
                        <button type="button" className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded font-medium text-sm shadow-sm" onClick={() => (onClose ? onClose() : window.history.back())}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            {/* Right File Upload Area */}
            <div className="w-[320px] pt-1 pr-6">
                {uploadedFiles.length > 0 ? (
                    <div className="bg-white border border-[#cbd5e1] rounded-xl min-h-[360px] flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#dbe1ea]">
                        <button
                          type="button"
                          onClick={handleUploadClick}
                          className="w-full bg-transparent text-[#334155] py-1.5 px-2 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <UploadIcon size={15} />
                          <ChevronDown size={14} className="text-gray-400" />
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                        {isImageUpload(uploadedFiles[0]) && uploadedPreviewUrl ? (
                          <img
                            src={uploadedPreviewUrl}
                            alt={String(uploadedFiles[0]?.name || "Uploaded image")}
                            className="max-h-[260px] w-auto rounded-md border border-gray-200 object-contain"
                          />
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                              <File size={38} className="text-[#2563eb]" />
                            </div>
                            <p className="mt-3 text-lg font-semibold text-[#334155]">{getDocumentTypeLabel(uploadedFiles[0])}</p>
                          </>
                        )}
                        <p className="mt-3 text-[22px] text-[#475569] break-all">{uploadedFiles[0]?.name}</p>
                      </div>
                      <div className="px-4 py-3 border-t border-dashed border-[#dbe1ea] flex items-center justify-between">
                        <span className="text-[24px] text-[#475569]">1 of {uploadedFiles.length} Files</span>
                        <button onClick={() => handleRemoveFile(uploadedFiles[0].id)} className="text-[#ef4444] hover:text-[#dc2626]">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                ) : (
                    <div
                      className="bg-white border border-dashed border-[#cbd5e1] rounded-lg px-5 py-4 min-h-[300px] flex cursor-pointer flex-col items-center text-center"
                      onClick={handleUploadClick}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                        <ImageIcon size={32} className="text-blue-900" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Drag or Drop your Receipts</h3>
                      <p className="text-xs text-gray-500 mb-4">Maximum file size allowed is 10MB</p>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                />
            </div>
            {typeof document !== "undefined" && document.body && createPortal(
                <div
                    className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${newCustomerModalOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
                    onClick={async () => {
                        setNewCustomerModalOpen(false);
                        await reloadCustomersForMileage();
                    }}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">New Customer (Quick Action)</h2>
                            <button
                                type="button"
                                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                                onClick={async () => {
                                    setNewCustomerModalOpen(false);
                                    await reloadCustomersForMileage();
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 p-2 bg-gray-100">
                            <iframe
                                key={customerQuickActionFrameKey}
                                title="New Customer Quick Action"
                                src="/sales/customers/new?embed=1"
                                loading="eager"
                                className="w-full h-full bg-white rounded border border-gray-200"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
