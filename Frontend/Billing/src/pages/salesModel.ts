/**
 * salesModel.js
 * Local model & helpers for Sales features (Customers, Custom Views, etc.).
 * Wraps db.js to provide zoho-compatible API
 */

import { db } from "../store/db";

const STORAGE_KEYS = {
  CUSTOM_VIEWS: 'taban_custom_views',
  TRANSACTIONS: 'taban_transactions',
  COMMENTS: 'taban_comments',
  MAILS: 'taban_mails'
};

/**
 * Get all customers from db
 * @returns {Array} Array of customer objects
 */
export const getCustomers = () => {
  try {
    return db.customers.list({});
  } catch (error) {
    console.error("Error getting customers:", error);
    return [];
  }
};

export const getCustomersPaginated = ({
  page = 1,
  limit = 50,
  search = "",
} = {}) => {
  const allCustomers = getCustomers();
  const q = String(search || "").trim().toLowerCase();

  const filtered = q
    ? allCustomers.filter((customer) =>
        Object.values(customer || {}).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(q)
        )
      )
    : allCustomers;

  const safeLimit = Math.max(1, Number(limit || 50));
  const safePage = Math.max(1, Number(page || 1));
  const start = (safePage - 1) * safeLimit;
  const data = filtered.slice(start, start + safeLimit);

  return {
    data,
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
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
export const saveCustomer = (customerData) => {
  try {
    const newCustomer = {
      ...customerData,
      id: customerData.id || db.utils.uid("cus"),
      createdAt: customerData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Ensure required fields have defaults
    if (!newCustomer.name) {
      newCustomer.name = newCustomer.displayName || newCustomer.companyName || "Unnamed Customer";
    }
    if (!newCustomer.currency) {
      newCustomer.currency = "USD";
    }
    if (!newCustomer.receivables) {
      newCustomer.receivables = parseFloat(newCustomer.openingBalance) || 0;
    }
    if (!newCustomer.paymentMethods) {
      newCustomer.paymentMethods = [];
    }
    if (!newCustomer.credits) {
      newCustomer.credits = 0;
    }
    
    db.customers.add(newCustomer);
    return newCustomer;
  } catch (error) {
    console.error("Error saving customer:", error);
    throw error;
  }
};

/**
 * Get a customer by ID
 * @param {string} id - Customer ID
 * @returns {Object|null} Customer object or null if not found
 */
export const getCustomerById = (id) => {
  try {
    return db.customers.get(id) || null;
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    return null;
  }
};

/**
 * Update an existing customer
 * @param {string} id - Customer ID
 * @param {Object} customerData - Updated customer data
 * @returns {Object|null} Updated customer or null if not found
 */
export const updateCustomer = (id, customerData) => {
  try {
    const existing = db.customers.get(id);
    if (!existing) {
      console.warn(`Customer with ID ${id} not found`);
      return null;
    }
    
    const updatedCustomer = {
      ...existing,
      ...customerData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    db.customers.update(id, updatedCustomer);
    return updatedCustomer;
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

/**
 * Delete a customer
 * @param {string} id - Customer ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteCustomer = (id) => {
  try {
    const existing = db.customers.get(id);
    if (!existing) {
      return false;
    }
    db.customers.remove(id);
    return true;
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
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
export const getCustomerTransactions = (customerId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (stored) {
      const allTransactions = JSON.parse(stored);
      return allTransactions.filter(t => t.customerId === customerId);
    }
    // Initialize with sample data if customer has invoices
    const customer = db.customers.get(customerId);
    if (customer) {
      const invoices = db.invoices.list({}).filter(inv => inv.customerId === customerId || inv.customer === customer.name);
      const sampleTransactions = invoices.map(inv => {
        const totals = db.invoices.calc(inv);
        return {
          id: inv.id,
          customerId: customerId,
          type: "invoice",
          date: inv.date,
          invoiceNumber: inv.id,
          orderNumber: "-",
          amount: totals.total,
          balanceDue: totals.total,
          status: inv.status || "Sent",
          currency: inv.currency || customer.currency || "USD"
        };
      });
      if (sampleTransactions.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sampleTransactions));
      }
      return sampleTransactions;
    }
    return [];
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
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


