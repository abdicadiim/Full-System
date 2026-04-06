/**
 * customersDbModel.ts
 * API-backed model used by Customers pages.
 */

import { customersAPI, invoicesAPI, paymentsReceivedAPI, salesReceiptsAPI } from "../services/api";

const STORAGE_KEYS = {
  CUSTOM_VIEWS: 'taban_custom_views',
  CUSTOMERS_PAGE_CACHE: 'taban_customers_page_cache_v1',
  TRANSACTIONS: 'taban_transactions',
  COMMENTS: 'taban_comments',
  MAILS: 'taban_mails'
};

const buildCustomersPageCacheKey = ({
  page = 1,
  limit = 50,
  search = "",
} = {}) => `${STORAGE_KEYS.CUSTOMERS_PAGE_CACHE}:${page}:${limit}:${String(search || "").trim().toLowerCase()}`;

export const getCachedCustomersPage = (params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) => {
  try {
    const key = buildCustomersPageCacheKey(params);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setCachedCustomersPage = (
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {},
  payload: {
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
) => {
  try {
    const key = buildCustomersPageCacheKey(params);
    localStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Cache is best-effort only.
  }
};

/**
 * Get all customers from db
 * @returns {Array} Array of customer objects
 */
export const getCustomers = async (params: any = {}) => {
  const res: any = await customersAPI.getAll(params);
  if (!res?.success) return [];
  const rows = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.items)
      ? res.items
      : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
  return rows;
};

export const getCustomersPaginated = async ({
  page = 1,
  limit = 50,
  search = "",
} = {}) => {
  const res: any = await customersAPI.getAll({ page, limit, search });
  if (!res?.success) throw new Error(res?.message || "Failed to load customers");
  const rows = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.items)
      ? res.items
      : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
  return {
    data: rows,
    total: res.total ?? res.pagination?.total ?? 0,
    page: res.page ?? res.pagination?.page ?? page,
    limit: res.limit ?? res.per_page ?? res.pagination?.limit ?? limit,
    totalPages: res.totalPages ?? res.pagination?.pages ?? 1,
  };
};

export type Customer = any;
export type Invoice = any;
export type CreditNote = any;
export type AttachedFile = any;
export type Quote = any;
export type RecurringInvoice = any;
export type Expense = any;
export type RecurringExpense = any;
export type Project = any;
export type Bill = any;
export type SalesReceipt = any;

/**
 * Save a new customer
 * @param {Object} customerData - Customer data object
 * @returns {Object} Saved customer with generated ID
 */
export const saveCustomer = async (customerData) => {
  const res: any = await customersAPI.create(customerData);
  if (!res?.success) throw new Error(res?.message || "Failed to save customer");
  return res.data;
};

/**
 * Get a customer by ID
 * @param {string} id - Customer ID
 * @returns {Object|null} Customer object or null if not found
 */
export const getCustomerById = async (id) => {
  const res: any = await customersAPI.getById(id);
  return res?.success ? res.data : null;
};

/**
 * Update an existing customer
 * @param {string} id - Customer ID
 * @param {Object} customerData - Updated customer data
 * @returns {Object|null} Updated customer or null if not found
 */
export const updateCustomer = async (id, customerData) => {
  const res: any = await customersAPI.update(id, customerData);
  return res?.success ? res.data : null;
};

/**
 * Delete a customer
 * @param {string} id - Customer ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteCustomer = async (id) => {
  const res: any = await customersAPI.delete(id);
  return Boolean(res?.success);
};

/**
 * Get all custom views from localStorage
 * @returns {Array} Array of custom view objects
 */
export const getCustomViews = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_VIEWS);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error getting custom views:", error);
    return [];
  }
};

/**
 * Save a custom view
 * @param {Object} viewData - Custom view data object
 * @returns {Object} Saved custom view with generated ID
 */
export const saveCustomView = (viewData) => {
  try {
    const views = getCustomViews();
    const newView = {
      ...viewData,
      id: viewData.id || `VIEW-${Date.now()}`,
      createdAt: viewData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    views.push(newView);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_VIEWS, JSON.stringify(views));
    return newView;
  } catch (error) {
    console.error("Error saving custom view:", error);
    throw error;
  }
};

/**
 * Delete a custom view
 * @param {string} id - Custom view ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteCustomView = (id) => {
  try {
    const views = getCustomViews();
    const filtered = views.filter(view => view.id !== id);
    
    if (filtered.length === views.length) {
      return false; // View not found
    }
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_VIEWS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting custom view:", error);
    throw error;
  }
};

// ========== TRANSACTIONS ==========

/**
 * Get all transactions for a customer
 * @param {string} customerId - Customer ID
 * @returns {Array} Array of transaction objects
 */
export const getCustomerTransactions = async (customerId) => {
  try {
    const [invoiceRes, paymentRes, receiptRes] = await Promise.all([
      invoicesAPI.getAll({ customerId, limit: 1000 }).catch(() => ({ success: true, data: [] })),
      paymentsReceivedAPI.getAll({ customerId, limit: 1000 }).catch(() => ({ success: true, data: [] })),
      salesReceiptsAPI.getAll({ customerId, limit: 1000 }).catch(() => ({ success: true, data: [] })),
    ]);

    const invoices = Array.isArray(invoiceRes?.data) ? invoiceRes.data : [];
    const payments = Array.isArray(paymentRes?.data) ? paymentRes.data : [];
    const receipts = Array.isArray(receiptRes?.data) ? receiptRes.data : [];

    const transactions = [
      ...invoices.map((inv: any) => ({
        id: inv.id || inv._id,
        customerId,
        type: "invoice",
        date: inv.date || inv.createdAt,
        invoiceNumber: inv.invoiceNumber || inv.number || inv.id || inv._id,
        orderNumber: inv.orderNumber || "-",
        amount: Number(inv.total ?? inv.balanceDue ?? inv.balance ?? 0) || 0,
        balanceDue: Number(inv.balanceDue ?? inv.balance ?? 0) || 0,
        status: inv.status || "Sent",
        currency: inv.currency || "USD",
      })),
      ...payments.map((payment: any) => ({
        id: payment.id || payment._id,
        customerId,
        type: "payment",
        date: payment.date || payment.paymentDate || payment.createdAt,
        invoiceNumber: payment.paymentNumber || payment.referenceNumber || payment.id || payment._id,
        orderNumber: "-",
        amount: Number(payment.amount ?? payment.total ?? 0) || 0,
        balanceDue: Number(payment.balance ?? payment.balanceAmount ?? 0) || 0,
        status: payment.status || "Paid",
        currency: payment.currency || "USD",
      })),
      ...receipts.map((receipt: any) => ({
        id: receipt.id || receipt._id,
        customerId,
        type: "sales_receipt",
        date: receipt.date || receipt.receiptDate || receipt.createdAt,
        invoiceNumber: receipt.receiptNumber || receipt.salesReceiptNumber || receipt.id || receipt._id,
        orderNumber: "-",
        amount: Number(receipt.total ?? receipt.amount ?? 0) || 0,
        balanceDue: Number(receipt.balance ?? 0) || 0,
        status: receipt.status || "Paid",
        currency: receipt.currency || "USD",
      })),
    ];

    if (transactions.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!stored) return [];
      const allTransactions = JSON.parse(stored);
      return Array.isArray(allTransactions)
        ? allTransactions.filter((t) => String(t?.customerId || "") === String(customerId))
        : [];
    } catch {
      return [];
    }
  }
};

/**
 * Save a transaction
 * @param {Object} transactionData - Transaction data object
 * @returns {Object} Saved transaction with generated ID
 */
export const saveTransaction = (transactionData) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions = stored ? JSON.parse(stored) : [];
    const newTransaction = {
      ...transactionData,
      id: transactionData.id || `${transactionData.type?.toUpperCase()}-${Date.now()}`,
      createdAt: transactionData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    transactions.push(newTransaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return newTransaction;
  } catch (error) {
    console.error("Error saving transaction:", error);
    throw error;
  }
};

// ========== COMMENTS ==========

/**
 * Get all comments for a customer
 * @param {string} customerId - Customer ID
 * @returns {Array} Array of comment objects
 */
export const getCustomerComments = (customerId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (stored) {
      const allComments = JSON.parse(stored);
      return allComments.filter(c => c.customerId === customerId).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    return [];
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
};

/**
 * Save a comment
 * @param {Object} commentData - Comment data object
 * @returns {Object} Saved comment with generated ID
 */
export const saveComment = (commentData) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const comments = stored ? JSON.parse(stored) : [];
    const newComment = {
      ...commentData,
      id: commentData.id || `COMMENT-${Date.now()}`,
      createdAt: commentData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    comments.push(newComment);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    return newComment;
  } catch (error) {
    console.error("Error saving comment:", error);
    throw error;
  }
};

// ========== MAILS ==========

/**
 * Get all mails for a customer
 * @param {string} customerId - Customer ID
 * @returns {Array} Array of mail objects
 */
export const getCustomerMails = (customerId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MAILS);
    if (stored) {
      const allMails = JSON.parse(stored);
      return allMails.filter(m => m.customerId === customerId).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    }
    return [];
  } catch (error) {
    console.error("Error getting mails:", error);
    return [];
  }
};

/**
 * Save a mail
 * @param {Object} mailData - Mail data object
 * @returns {Object} Saved mail with generated ID
 */
export const saveMail = (mailData) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MAILS);
    const mails = stored ? JSON.parse(stored) : [];
    const newMail = {
      ...mailData,
      id: mailData.id || `MAIL-${Date.now()}`,
      createdAt: mailData.createdAt || new Date().toISOString()
    };
    mails.push(newMail);
    localStorage.setItem(STORAGE_KEYS.MAILS, JSON.stringify(mails));
    return newMail;
  } catch (error) {
    console.error("Error saving mail:", error);
    throw error;
  }
};


