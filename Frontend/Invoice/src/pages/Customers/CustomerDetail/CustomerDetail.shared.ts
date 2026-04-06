import { Customer, CustomerAddress, Invoice, CreditNote, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";

export interface ExtendedCustomer extends Customer {
    billingAttention: string;
    billingCountry: string;
    billingStreet1: string;
    billingStreet2: string;
    billingCity: string;
    billingState: string;
    billingZipCode: string;
    billingPhone: string;
    billingFax: string;
    shippingAttention: string;
    shippingCountry: string;
    shippingStreet1: string;
    shippingStreet2: string;
    shippingCity: string;
    shippingState: string;
    shippingZipCode: string;
    shippingPhone: string;
    shippingFax: string;
    additionalAddresses?: CustomerAddress[];
    enablePortal?: boolean;
    paymentReminderEnabled?: boolean;
    remarks: string;
    openingBalance?: string | number;
    profileImage?: string | ArrayBuffer | null;
    createdDate?: string;
    createdAt?: string;
    updatedAt?: string;
    modifiedAt?: string;
    updated_on?: string;
    linkedVendorId?: string | null;
    linkedVendorName?: string | null;
    comments?: CustomerDetailComment[];
}

export interface CustomerDetailTransaction {
    id: string;
    date: string;
    type: string;
    details: string;
    detailsLink?: string;
    amount: number;
    payments: number;
    balance: number;
}

export interface CustomerDetailComment {
    id: string | number;
    text: string;
    author: string;
    timestamp: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export interface CustomerDetailMail {
    id: string | number;
    to: string;
    subject: string;
    description: string;
    date: string;
    type: string;
    initial: string;
}

export type CustomerDetailInvoice = Invoice;
export type CustomerDetailCreditNote = CreditNote;
export type CustomerDetailQuote = Quote;
export type CustomerDetailRecurringInvoice = RecurringInvoice;
export type CustomerDetailExpense = Expense;
export type CustomerDetailRecurringExpense = RecurringExpense;
export type CustomerDetailProject = Project;
export type CustomerDetailBill = Bill;
export type CustomerDetailSalesReceipt = SalesReceipt;
export type Transaction = CustomerDetailTransaction;
export type Comment = CustomerDetailComment;
export type Mail = CustomerDetailMail;

export type AddressFormState = {
    attention: string;
    country: string;
    street1: string;
    street2: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax: string;
};

export type ContactPersonFormState = {
    salutation: string;
    firstName: string;
    lastName: string;
    email: string;
    workPhone: string;
    mobile: string;
    skypeName: string;
    designation: string;
    department: string;
    isPrimary: boolean;
    enablePortal: boolean;
};

export const createEmptyAddressForm = (): AddressFormState => ({
    attention: "",
    country: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    fax: "",
});

export const createEmptyContactPersonForm = (): ContactPersonFormState => ({
    salutation: "Mr",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    skypeName: "",
    designation: "",
    department: "",
    isPrimary: false,
    enablePortal: false,
});

export const normalizeAddressForm = (address: any = {}): AddressFormState => ({
    attention: String(address?.attention || address?.billingAttention || "").trim(),
    country: String(address?.country || address?.billingCountry || "").trim(),
    street1: String(address?.street1 || address?.addressLine1 || address?.address || address?.billingStreet1 || "").trim(),
    street2: String(address?.street2 || address?.addressLine2 || address?.billingStreet2 || "").trim(),
    city: String(address?.city || address?.billingCity || "").trim(),
    state: String(address?.state || address?.billingState || "").trim(),
    zipCode: String(address?.zipCode || address?.zip || address?.postalCode || address?.billingZipCode || "").trim(),
    phone: String(address?.phone || address?.billingPhone || "").trim(),
    fax: String(address?.fax || address?.faxNumber || address?.billingFax || "").trim(),
});

export const normalizeAddressRow = (address: any) => {
    if (!address || typeof address !== "object") return null;

    const addressId = String(address.addressId || address.id || address._id || address.address_id || "").trim();
    if (!addressId) return null;

    const type = String(address.type || "").toLowerCase();
    if (type === "billing" || type === "shipping" || addressId === "billing" || addressId === "shipping") {
        return null;
    }

    return {
        addressId,
        ...normalizeAddressForm(address),
        type: type || "additional",
        createdAt: String(address.createdAt || address.created_time || "").trim(),
        updatedAt: String(address.updatedAt || address.last_modified_time || "").trim(),
    };
};

export const formatAddressSummary = (address: any) => {
    const normalized = normalizeAddressForm(address);
    return [normalized.attention, normalized.street1, normalized.street2, normalized.city, normalized.state, normalized.zipCode, normalized.country]
        .filter(Boolean)
        .join(", ");
};

export const getContactPersonId = (person: any, index = 0) =>
    String(person?.id || person?._id || person?.contact_person_id || person?.contactPersonId || `${index + 1}`).trim();

export const getContactPersonName = (person: any) =>
    [person?.salutation, person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || "Contact Person";

export const normalizeContactPersonForm = (person: any = {}): ContactPersonFormState => ({
    salutation: String(person?.salutation || "Mr").trim() || "Mr",
    firstName: String(person?.firstName || person?.givenName || "").trim(),
    lastName: String(person?.lastName || person?.familyName || "").trim(),
    email: String(person?.email || "").trim(),
    workPhone: String(person?.workPhone || person?.phone || "").trim(),
    mobile: String(person?.mobile || person?.mobilePhone || "").trim(),
    skypeName: String(person?.skypeName || person?.skype || "").trim(),
    designation: String(person?.designation || "").trim(),
    department: String(person?.department || "").trim(),
    isPrimary: Boolean(person?.isPrimary || person?.isPrimaryContact),
    enablePortal: Boolean(person?.enablePortal ?? person?.hasPortalAccess ?? false),
});

export const normalizeContactPersonRecord = (person: any, index = 0) => {
    const normalized = normalizeContactPersonForm(person);
    return {
        id: getContactPersonId(person, index),
        ...normalized,
        hasPortalAccess: Boolean(person?.hasPortalAccess ?? person?.enablePortal ?? normalized.enablePortal),
    };
};

export const formatCurrency = (amount: any, currency = "AMD") => {
    return `${currency}${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0)}`;
};

export const formatDateForDisplay = (date: any) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatMailDateTime = (date: any) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
    const datePart = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${datePart} ${timePart}`;
};

export const formatStatusLabel = (value: string) =>
    String(value || "")
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

export const normalizeInvoiceStatus = (invoice: any) => {
    const raw = String(invoice?.status || "draft").toLowerCase();
    if (raw === "void") return "void";
    if (raw === "paid") return "paid";
    if (raw === "overdue") return "overdue";
    if (raw === "partially paid" || raw === "partial" || raw === "partial paid") return "partially paid";
    if (raw === "open" || raw === "unpaid") return "unpaid";
    if (raw === "sent" || raw === "viewed" || invoice?.customerViewed) return "client viewed";
    return "draft";
};

export const normalizeComments = (rawComments: any): CustomerDetailComment[] => {
    if (!Array.isArray(rawComments)) return [];
    return rawComments
        .filter((item: any) => item && typeof item.text === "string" && item.text.trim() !== "")
        .map((item: any, index: number) => ({
            id: item.id ?? item._id ?? `${Date.now()}-${index}`,
            text: item.text,
            author: item.author || "You",
            timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
            bold: Boolean(item.bold),
            italic: Boolean(item.italic),
            underline: Boolean(item.underline),
        }));
};
