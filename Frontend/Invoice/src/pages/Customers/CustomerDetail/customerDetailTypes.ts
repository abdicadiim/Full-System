import { Customer } from "../../salesModel";

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
  remarks: string;
  openingBalance?: string | number;
  profileImage?: string | ArrayBuffer | null;
  createdDate?: string;
  linkedVendorId?: string | null;
  linkedVendorName?: string | null;
  comments?: CustomerDetailComment[];
}

export interface Transaction {
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

export type PhoneCodeOption = {
  code: string;
  name: string;
};

export type CustomerPdfTemplates = {
  customerStatement: string;
  quotes: string;
  invoices: string;
  creditNotes: string;
  paymentThankYou: string;
};
