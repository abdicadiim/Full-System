// Type definitions for NewSalesReceipt component

export interface Customer {
    id: string | number;
    _id?: string;
    name: string;
    email?: string;
    companyName?: string;
    workPhone?: string;
    mobile?: string;
    displayName?: string;
}

export interface Salesperson {
    id: string | number;
    _id?: string;
    name: string;
    email?: string;
}

export interface Item {
    id: string | number;
    _id?: string;
    name: string;
    sku?: string;
    rate: number;
    stockOnHand?: number;
    unit?: string;
    quantity?: number;
}

export interface Account {
    id: string | number;
    _id?: string;
    name: string;
    account_type?: string;
    code?: string;
}

export interface Document {
    id: number | string;
    name: string;
    size: string | number;
    file?: File | null;
    documentId?: string | number;
    uploadedOn?: string;
    isCloud?: boolean;
    provider?: string;
    folder?: string;
    module?: string;
    type?: string;
    modified?: string;
}

export interface SalesReceiptItem {
    id: number;
    itemDetails: string;
    quantity: number;
    rate: number;
    tax: string;
    amount: number;
}

export interface FormData {
    customerName: string;
    receiptDate: string;
    receiptNumber: string;
    salesperson: string;
    taxInclusive: string;
    items: SalesReceiptItem[];
    discount: string;
    discountType: string;
    shippingCharges: string;
    adjustment: string;
    subTotal: number;
    roundOff: number;
    total: number;
    notes: string;
    termsAndConditions: string;
    paymentMode: string;
    depositTo: string;
    depositToAccountId?: string | number;
    referenceNumber: string;
    currency: string;
    documents: Document[];
}

export interface TaxOption {
    id: string;
    name: string;
    rate: number;
}

export interface TransactionNumberSeries {
    id: string | number;
    module: string;
    name: string;
    prefix?: string;
    next_number?: string;
}
