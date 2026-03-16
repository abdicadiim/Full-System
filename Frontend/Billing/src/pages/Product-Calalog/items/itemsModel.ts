/**
 * itemsModel.ts
 * Shared types, constants, and helpers for Items feature.
 */

export const Z = {
  bg: "#f6f7fb",
  card: "#ffffff",
  line: "#e5e7eb",
  line2: "#e9ecf2",
  primary: "#2663eb",
  primaryHover: "#1f54c9",
  textMuted: "#6b7280",
};

export const fmtMoney = (n: number | string, symbol = "$") => {
  const v = typeof n === "number" ? n : Number(n || 0);
  const sign = v < 0 ? "-" : "";
  const s = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${s}`;
};

export interface Item {
  id?: string;
  _id?: string;
  name: string;
  sku?: string;
  images?: string[];
  image?: string;
  active?: boolean;
  status?: string;
  locked?: boolean;
  isDigitalService?: boolean;
  trackInventory?: boolean;
  sellingPrice?: number;
  costPrice?: number;
  salesAccount?: string;
  purchaseAccount?: string;
  inventoryAccount?: string;
  openingStock?: number;
  stockQuantity?: number;
  stockOnHand?: number;
  currency?: string;
  unit?: string;
  description?: string;
  salesDescription?: string;
  purchaseDescription?: string;
  transactions?: any[];
  __v?: number;
  [key: string]: any;
}

export type TransactionType =
  | "Bills"
  | "Invoices"
  | "Purchase Orders"
  | "Quotes"
  | "Credit Notes"
  | "Sales Receipts"
  | "Debit Notes"
  | "Vendor Credits"
  | "Expenses"
  | "Inventory Adjustments"
  | "Recurring Invoices";

export interface Transaction {
  id: string;
  type: TransactionType;
  transactionType: TransactionType;
  date: string | Date;
  number: string;
  customerName: string;
  quantity: string | number;
  price: string | number;
  total: string | number;
  status: string;
  reference?: string;
}

export interface DeleteConfirmModal {
  open: boolean;
  itemId: string | null;
  itemName: string | null;
  count: number;
  itemIds: string[] | null;
}

export const sampleItems = [
  { id: "ITM-001", name: "Sample Item A", sku: "SKU-A", rate: 25, status: "Active" },
  { id: "ITM-002", name: "Sample Item B", sku: "SKU-B", rate: 10, status: "Inactive" },
  { id: "ITM-003", name: "Sample Item C", sku: "SKU-C", rate: 5, status: "Active" }
];

