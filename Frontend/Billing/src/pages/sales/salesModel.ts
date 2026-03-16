import { recurringInvoicesAPI, quotesAPI, invoicesAPI, customersAPI, taxesAPI, itemsAPI, salespersonsAPI, salesReceiptsAPI, paymentsReceivedAPI, creditNotesAPI, projectsAPI, settingsAPI, plansAPI, reportingTagsAPI } from "../../services/api";


const STORAGE_KEY = "taban_books_customers";

// Lightweight in-memory cache to reduce repeated dropdown fetches across pages.
// Keeps UI responsive when navigating between list/new/detail pages.
const MEMORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
type CacheEntry<T> = { ts: number; value?: T; promise?: Promise<T> };
const memoryCache = new Map<string, CacheEntry<any>>();

const cachedFetch = async <T,>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = MEMORY_CACHE_TTL_MS
): Promise<T> => {
  const now = Date.now();
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && now - entry.ts < ttlMs) {
    return entry.value;
  }
  if (entry?.promise) {
    return entry.promise;
  }

  const promise = fetcher()
    .then((value) => {
      memoryCache.set(key, { ts: Date.now(), value });
      return value;
    })
    .catch((err) => {
      memoryCache.delete(key);
      throw err;
    });

  memoryCache.set(key, { ts: entry?.ts ?? now, value: entry?.value, promise });
  return promise;
};

export interface ContactPerson {
  id?: string;
  _id?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone?: string;
  mobile?: string;
  designation?: string;
  department?: string;
  skypeName?: string;
  isPrimary?: boolean;
  hasPortalAccess?: boolean;
  enablePortal?: boolean;
}

export interface Customer {
  id: string;
  _id?: string;
  name: string;
  customerNumber?: string;
  displayName?: string;
  companyName?: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  receivables: number;
  currency: string;
  openingBalance?: string;
  customerOwner?: string;
  documents?: any[];
  contactPersons?: ContactPerson[];
  customFields?: Record<string, any>;
  reportingTags?: any[];
  comments?: Array<{
    id?: string | number;
    _id?: string;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  remarks?: string;
  createdAt?: string;
  createdBy?: string;
  status?: string;
  isActive?: boolean;
  notes?: string;
  firstName?: string;
  lastName?: string;
  customerType?: string;
  enablePortal?: boolean;
  customerLanguage?: string;
  paymentTerms?: string;
  unusedCredits?: number;
  billingAddress?: {
    attention?: string;
    country?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    fax?: string;
  };
  shippingAddress?: {
    attention?: string;
    country?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    fax?: string;
  };
  reviewRequested?: boolean;
  reviewRequestedAt?: string;
}

// Sample data for initial setup
const initialCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "mohamed Ali",
    companyName: "ss",
    email: "sss@gmail.com",
    workPhone: "22",
    receivables: 0.00,
    currency: "AMD"
  },
  {
    id: "CUST-002",
    name: "Acme Corp",
    companyName: "Acme Corporation",
    email: "billing@acme.test",
    workPhone: "+1-555-0123",
    receivables: 1500.50,
    currency: "AMD"
  },
  {
    id: "CUST-003",
    name: "Global Traders",
    companyName: "Global Trading Co.",
    email: "info@global.test",
    workPhone: "+1-555-0456",
    receivables: 2300.75,
    currency: "AMD"
  }
];

// LocalStorage utility functions
export const getCustomers = async (params: any = {}): Promise<Customer[]> => {
  // Use a large limit for dropdowns if not specified
  const finalParams = { limit: 1000, ...params };
  const cacheKey = `customers:${JSON.stringify(finalParams)}`;
  return cachedFetch(cacheKey, async () => {
    const response = await getCustomersFromAPI(finalParams);
    return response.data || [];
  });
};

export const getCustomersPaginated = async (params: any = {}): Promise<any> => {
  return getCustomersFromAPI(params);
};


export const getCustomersFromAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await customersAPI.getAll(params);
    if (response && response.success && response.data) {
      const data = response.data.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        email: c.email || "",
        workPhone: c.workPhone || c.mobile || ""
      }));
      return {
        data,
        pagination: (response as any).pagination || {
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching customers from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getCustomerById = async (customerId: string | number): Promise<Customer | null> => {
  try {
    const response = await customersAPI.getById(String(customerId));
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting customer by ID from API:", error);
    return null;
  }
};

export const saveCustomer = async (customerData: Partial<Customer>): Promise<Customer> => {
  try {
    const response = await customersAPI.create(customerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create customer");
  } catch (error) {
    console.error("Error saving customer to API:", error);
    throw error;
  }
};

export const updateCustomer = async (customerId: string, customerData: Partial<Customer>): Promise<Customer | undefined> => {
  try {
    const response = await customersAPI.update(customerId, customerData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update customer");
  } catch (error) {
    console.error("Error updating customer in API:", error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    await customersAPI.delete(customerId);
  } catch (error) {
    console.error("Error deleting customer from API:", error);
    throw error;
  }
};

export const deleteCustomers = async (customerIds: string[]): Promise<void> => {
  try {
    await customersAPI.bulkDelete(customerIds);
  } catch (error) {
    console.error("Error deleting customers from API:", error);
    throw error;
  }
};

export interface CustomView {
  id: string;
  name: string;
  entityType: string;
  filters: any;
  columns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  type?: string;
  criteria?: any[];
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Custom Views Storage
const CUSTOM_VIEWS_STORAGE_KEY = "taban_books_custom_views";

export const getCustomViews = (): CustomView[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_VIEWS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error("Error reading custom views from localStorage:", error);
    return [];
  }
};

export const saveCustomView = (customViewData: Partial<CustomView>): CustomView => {
  try {
    const customViews = getCustomViews();
    const newView: CustomView = {
      id: Date.now().toString(),
      name: "",
      entityType: "",
      filters: {},
      columns: [],
      sortBy: "createdAt",
      sortOrder: "desc",
      ...customViewData,
      createdAt: new Date().toISOString()
    } as CustomView;
    const updatedViews = [...customViews, newView];
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(updatedViews));
    return newView;
  } catch (error) {
    console.error("Error saving custom view to localStorage:", error);
    throw error;
  }
};

export const updateCustomView = (viewId: string, customViewData: Partial<CustomView>): void => {
  try {
    const customViews = getCustomViews();
    const updatedViews = customViews.map(view =>
      view.id === viewId ? { ...view, ...customViewData, updatedAt: new Date().toISOString() } : view
    );
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(updatedViews));
  } catch (error) {
    console.error("Error updating custom view in localStorage:", error);
    throw error;
  }
};

export const deleteCustomView = (viewId: string): void => {
  try {
    const customViews = getCustomViews();
    const filtered = customViews.filter(v => v.id !== viewId);
    localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting custom view from localStorage:", error);
    throw error;
  }
};

export interface AttachedFile {
  id: string | number;
  name: string;
  size?: string | number;
  type?: string;
  url?: string;
  file?: File | null;
  documentId?: string;
  mimeType?: string;
  uploadedAt?: string;
  preview?: string | null;
}

export interface Invoice {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  date: string;
  invoiceDate?: string;
  dueDate: string;
  expectedPaymentDate?: string;
  items: any[];
  subtotal: number;
  subTotal?: number;
  tax: number;
  amount?: number;
  total: number;
  status: string;
  organization?: string;
  salesperson?: any;
  salespersonId?: string;
  orderNumber?: string;
  receipt?: string;
  accountsReceivable?: string;
  subject?: string;
  taxExclusive?: string;
  discount?: number;
  discountType?: string;
  discountAccount?: string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  shipping?: number;
  adjustment?: number;
  roundOff?: number;
  currency?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  attachedFiles?: AttachedFile[];
  balanceDue?: number;
  balance?: number;
  amountPaid?: number;
  customerViewed?: boolean;
  locked?: boolean;
  pendingApproval?: boolean;
  approved?: boolean;
  paymentInitiated?: boolean;
  void?: boolean;
  type?: string;
  debitNote?: boolean;
  writeOff?: boolean;
  lastModifiedTime?: string;
  createdAt?: string;
  updatedAt?: string;
  customerEmail?: string;
  remindersStopped?: boolean;
  remindersStoppedAt?: string;
}

// For backward compatibility
export const sampleCustomers = initialCustomers;

// Invoices Storage
const INVOICES_STORAGE_KEY = "taban_books_invoices";

export const getInvoices = async (params: any = {}): Promise<Invoice[]> => {
  const finalParams = { limit: 1000, ...params };
  const response = await getInvoicesPaginated(finalParams);
  return response.data || [];
};

export const getInvoicesPaginated = async (params: any = {}): Promise<any> => {
  try {
    const response = await invoicesAPI.getAll(params);
    if (response && response.success && response.data) {
      const data = response.data.map((invoice: any) => ({
        ...invoice,
        id: invoice._id || invoice.id, // Ensure id exists
        customerName: invoice.customerName || invoice.customer?.displayName || invoice.customer?.companyName || invoice.customer?.name || (typeof invoice.customer === 'string' ? invoice.customer : ""),
        status: invoice.status || "draft"
      }));
      return {
        data,
        pagination: response.pagination || {
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching invoices from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    const response = await invoicesAPI.getById(invoiceId);
    if (response && response.success && response.data) {
      const invoice = response.data;
      return {
        ...invoice,
        id: invoice._id || invoice.id,
        customerName: invoice.customer?.displayName || invoice.customer?.companyName || invoice.customer?.name || "",
        status: invoice.status || "draft"
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting invoice by ID from API:", error);
    return null;
  }
};

export const saveInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice> => {
  try {
    const response = await invoicesAPI.create(invoiceData);
    if (response && response.success && response.data) {
      const saved = response.data;
      return { ...saved, id: saved._id || saved.id };
    }
    throw new Error("Failed to create invoice");
  } catch (error) {
    console.error("Error saving invoice to API:", error);
    throw error;
  }
};

export const updateInvoice = async (invoiceId: string, invoiceData: Partial<Invoice>): Promise<Invoice> => {
  try {
    const response = await invoicesAPI.update(invoiceId, invoiceData);
    if (response && response.success && response.data) {
      const updated = response.data;
      return { ...updated, id: updated._id || updated.id };
    }
    throw new Error("Failed to update invoice");
  } catch (error) {
    console.error("Error updating invoice in API:", error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<Invoice[]> => {
  try {
    const response = await invoicesAPI.delete(invoiceId);
    if (response && response.success) {
      return await getInvoices();
    }
    throw new Error("Failed to delete invoice");
  } catch (error) {
    console.error("Error deleting invoice from API:", error);
    throw error;
  }
};

export interface Tax {
  id: string;
  _id?: string;
  name: string;
  rate: number;
  type?: string;
  isCompound?: boolean;
  isRecoverable?: boolean;
  createdAt?: string;
}

// For backward compatibility
export const sampleInvoices = [];

// Taxes Storage
const TAXES_STORAGE_KEY = "taban_books_taxes";

export const getTaxes = async (): Promise<Tax[]> => {
  return getTaxesFromAPI();
};

export const getTaxesFromAPI = async (): Promise<Tax[]> => {
  try {
    const response = await taxesAPI.getForTransactions();
    if (response && response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching taxes from API:", error);
    return [];
  }
};

export const saveTax = async (taxData: Partial<Tax>): Promise<Tax> => {
  try {
    const response = await taxesAPI.create(taxData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create tax");
  } catch (error) {
    console.error("Error saving tax to API:", error);
    throw error;
  }
};

export const deleteTax = async (taxId: string): Promise<void> => {
  try {
    await taxesAPI.delete(taxId);
  } catch (error) {
    console.error("Error deleting tax from API:", error);
    throw error;
  }
};

export interface RecurringInvoice extends Invoice {
  frequency: string;
  startDate: string;
  endDate?: string;
  lastGenerated?: string;
  // Additional optional fields used by the frontend UI
  profileName?: string;
  repeatEvery?: string | number;
  nextInvoiceDate?: string;
  lastInvoiceDate?: string;
  startOn?: string;
  endsOn?: string;
  paymentTerms?: string;
  // Allow flexible additional properties from API
  [key: string]: any;
}

// Recurring Invoices - Now using API instead of localStorage

export const getRecurringInvoices = async (): Promise<RecurringInvoice[]> => {
  try {
    const response = await recurringInvoicesAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : "")
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching recurring invoices from API:", error);
    return [];
  }
};

export const saveRecurringInvoice = async (recurringInvoiceData: Partial<RecurringInvoice>): Promise<RecurringInvoice> => {
  try {
    const response = await recurringInvoicesAPI.create(recurringInvoiceData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save recurring invoice: Invalid response from API');
  } catch (error) {
    console.error("Error saving recurring invoice to API:", error);
    throw error;
  }
};

export const updateRecurringInvoice = async (recurringInvoiceId: string, updatedData: Partial<RecurringInvoice>): Promise<RecurringInvoice> => {
  try {
    const response = await recurringInvoicesAPI.update(recurringInvoiceId, updatedData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update recurring invoice: Invalid response from API');
  } catch (error) {
    console.error("Error updating recurring invoice via API:", error);
    throw error;
  }
};

export const getRecurringInvoiceById = async (recurringInvoiceId: string): Promise<RecurringInvoice | null> => {
  if (!recurringInvoiceId || recurringInvoiceId === "undefined") return null;
  try {
    const response = await recurringInvoicesAPI.getById(recurringInvoiceId);
    if (response && response.success && response.data) {
      const data = response.data;
      return {
        ...data,
        id: data._id || data.id
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting recurring invoice by ID from API:", error);
    return null;
  }
};

export const deleteRecurringInvoice = async (recurringInvoiceId: string): Promise<RecurringInvoice[]> => {
  try {
    const response = await recurringInvoicesAPI.delete(recurringInvoiceId);
    if (response && response.success) {
      // Return updated list
      return await getRecurringInvoices();
    }
    throw new Error('Failed to delete recurring invoice');
  } catch (error) {
    console.error("Error deleting recurring invoice via API:", error);
    throw error;
  }
};

export const generateInvoiceFromRecurring = async (recurringInvoiceId: string): Promise<any> => {
  try {
    const response = await recurringInvoicesAPI.generateInvoice(recurringInvoiceId);
    if (response && response.success) {
      return response.data;
    }
    throw new Error('Failed to generate invoice from recurring profile');
  } catch (error) {
    console.error("Error generating invoice from recurring profile:", error);
    throw error;
  }
};

export interface Payment {
  id: string;
  _id?: string;
  customer?: any;
  customerName?: string;
  customerId?: string;
  amount?: number;
  amountReceived?: number;
  date: string;
  paymentDate?: string;
  paymentMethod: string;
  paymentMode?: string;
  reference?: string;
  paymentReference?: string;
  referenceNumber?: string;
  notes?: string;
  paymentNumber?: string;
  customerEmail?: string;
  currency?: string;
  thankYouRecipients?: { email: string }[];
  allocations?: any[];
  unusedAmount?: number;
  depositTo?: string;
  status?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type?: string;
    size?: number;
    preview?: string;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  comments?: Array<{
    id: string;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
}

// Payments Received storage functions
// Payments Received storage functions
const PAYMENTS_STORAGE_KEY = "taban_books_payments_received";

export const getNextPaymentNumber = async (): Promise<string> => {
  try {
    const response = await paymentsReceivedAPI.getAll({ limit: 10000 });
    if (response && response.success && response.data && response.data.length > 0) {
      const numbers = response.data
        .map((p: any) => {
          const num = p.paymentNumber || "";
          // Extract numbers if it's like "PAY-001" or just "1"
          const match = num.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n: number) => n > 0);

      if (numbers.length > 0) {
        return (Math.max(...numbers) + 1).toString();
      }
      return (response.data.length + 1).toString();
    }
    return "1";
  } catch (error) {
    console.error("Error generating next payment number:", error);
    return "1";
  }
};

export const getPayments = async (): Promise<Payment[]> => {
  try {
    const response = await paymentsReceivedAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customer?.displayName || item.customer?.name || item.customer?.companyName || (typeof item.customer === 'string' ? item.customer : ""),
        customerId: item.customer?._id || item.customer,
        amountReceived: item.amount,
        status: item.status || 'paid',
        paymentDate: item.date,
        paymentMode: item.paymentMethod === 'cash' ? 'Cash' :
          item.paymentMethod === 'check' ? 'Check' :
            item.paymentMethod === 'card' ? 'Credit Card' :
              item.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                (item.paymentMethod || 'Other'),
        referenceNumber: item.paymentReference || item.referenceNumber || ""
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching payments from API:", error);
    return [];
  }
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  try {
    const response = await paymentsReceivedAPI.getById(paymentId);
    if (response && response.success && response.data) {
      const payment = response.data;
      return {
        ...payment,
        id: payment._id || payment.id,
        status: payment.status || 'paid',
        amountReceived: payment.amount,
        paymentDate: payment.date,
        customerName: payment.customer?.displayName || payment.customer?.name || "",
        paymentMode: payment.paymentMethod === 'cash' ? 'Cash' :
          payment.paymentMethod === 'check' ? 'Check' :
            payment.paymentMethod === 'card' ? 'Credit Card' :
              payment.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                (payment.paymentMethod || 'Other'),
        referenceNumber: payment.paymentReference || payment.referenceNumber || "",
        allocations: payment.allocations || []
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting payment by ID from API:", error);
    return null;
  }
};

export const savePayment = async (paymentData: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await paymentsReceivedAPI.create(paymentData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save payment');
  } catch (error) {
    console.error("Error saving payment to API:", error);
    throw error;
  }
};

export const updatePayment = async (paymentId: string, updatedData: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await paymentsReceivedAPI.update(paymentId, updatedData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update payment');
  } catch (error) {
    console.error("Error updating payment in API:", error);
    throw error;
  }
};

export const deletePayment = async (paymentId: string): Promise<Payment[]> => {
  try {
    const response = await paymentsReceivedAPI.delete(paymentId);
    if (response && response.success) {
      return await getPayments();
    }
    throw new Error('Failed to delete payment');
  } catch (error) {
    console.error("Error deleting payment from API:", error);
    throw error;
  }
};

export interface CreditNote {
  id: string;
  _id?: string;
  creditNoteNumber: string;
  customer?: any;
  customerName?: string;
  customerEmail?: string;
  date: string;
  creditNoteDate?: string;
  items: any[];
  subtotal: number;
  subTotal?: number;
  tax: number;
  total: number;
  amount?: number;
  amountReceived?: number;
  balance?: number;
  status: string;
  reason?: string;
  referenceNumber?: string;
  currency?: string;
  subject?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  companyName?: string;
  salesperson?: any;
  salespersonId?: string;
  customerId?: string;
  attachedFiles?: AttachedFile[];
  comments?: Array<{
    id?: string | number;
    text: string;
    author?: string;
    timestamp?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  journalEntry?: any;
  discount?: number;
  shipping?: number;
  vat?: number;
  taxes?: any[]; // For tax breakdown
}

// Credit Notes Storage
const CREDIT_NOTES_STORAGE_KEY = "taban_books_credit_notes";

export const getCreditNotes = async (): Promise<CreditNote[]> => {
  try {
    const response = await creditNotesAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : "")
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching credit notes from API:", error);
    return [];
  }
};

export const getCreditNoteById = async (creditNoteId: string): Promise<CreditNote | null> => {
  try {
    const response = await creditNotesAPI.getById(creditNoteId);
    if (response && response.success && response.data) {
      const note = response.data;
      return {
        ...note,
        id: note._id || note.id,
        customerId: note.customer?._id || note.customer,
        customerName: note.customer?.displayName || note.customer?.name || "",
        customerEmail: note.customer?.email || ""
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting credit note by ID from API:", error);
    return null;
  }
};

export const saveCreditNote = async (creditNoteData: Partial<CreditNote>): Promise<CreditNote> => {
  try {
    const response = await creditNotesAPI.create(creditNoteData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save credit note');
  } catch (error) {
    console.error("Error saving credit note to API:", error);
    throw error;
  }
};

export const updateCreditNote = async (creditNoteId: string, creditNoteData: Partial<CreditNote>): Promise<CreditNote> => {
  try {
    const response = await creditNotesAPI.update(creditNoteId, creditNoteData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update credit note');
  } catch (error) {
    console.error("Error updating credit note in API:", error);
    throw error;
  }
};

export const deleteCreditNote = async (creditNoteId: string): Promise<CreditNote[]> => {
  try {
    const response = await creditNotesAPI.delete(creditNoteId);
    if (response && response.success) {
      return await getCreditNotes();
    }
    throw new Error('Failed to delete credit note');
  } catch (error) {
    console.error("Error deleting credit note from API:", error);
    throw error;
  }
};

export const getCreditNotesByInvoiceId = async (invoiceId: string): Promise<CreditNote[]> => {
  try {
    const response = await creditNotesAPI.getByInvoice(invoiceId);
    if (response && response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching credit notes by invoice ID:", error);
    return [];
  }
};

export interface SalesReceipt {
  id: string;
  _id?: string;
  receiptNumber: string;
  customer?: any;
  customerName?: string;
  customerId?: string;
  referenceNumber?: string;
  receiptDate?: string;
  date: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount?: number;
  discountType?: "percent" | "amount" | string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  adjustment?: number;
  total: number;
  amount?: number;
  status: string;
  paymentMethod?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type?: string;
    size?: number;
    preview?: string;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  comments?: Array<{
    id: string;
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    author?: string;
    timestamp?: string;
  }>;
}

// Sales Receipts Storage
const SALES_RECEIPTS_STORAGE_KEY = "taban_books_sales_receipts";

export const getSalesReceipts = async (params: any = {}): Promise<SalesReceipt[]> => {
  const finalParams = { limit: 1000, ...params };
  const response = await getSalesReceiptsPaginated(finalParams);
  return response.data || [];
};

export const getSalesReceiptsPaginated = async (params: any = {}): Promise<any> => {
  try {
    const response = await salesReceiptsAPI.getAll(params);
    if (response && response.success && response.data) {
      const data = response.data.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        customerName: item.customerName || item.customer?.displayName || item.customer?.companyName || item.customer?.name || (typeof item.customer === 'string' ? item.customer : "")
      }));
      return {
        data,
        pagination: response.pagination || {
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        }
      };
    }
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  } catch (error) {
    console.error("Error fetching sales receipts from API:", error);
    return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
  }
};

export const getSalesReceiptById = async (receiptId: string): Promise<SalesReceipt | null> => {
  try {
    const response = await salesReceiptsAPI.getById(receiptId);
    if (response && response.success && response.data) {
      const data = response.data;
      return {
        ...data,
        id: data._id || data.id
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting sales receipt by ID from API:", error);
    return null;
  }
};

export const saveSalesReceipt = async (receiptData: Partial<SalesReceipt>): Promise<SalesReceipt> => {
  try {
    const response = await salesReceiptsAPI.create(receiptData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to save sales receipt');
  } catch (error) {
    console.error("Error saving sales receipt to API:", error);
    throw error;
  }
};

export const updateSalesReceipt = async (receiptId: string, receiptData: Partial<SalesReceipt>): Promise<SalesReceipt> => {
  try {
    const response = await salesReceiptsAPI.update(receiptId, receiptData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to update sales receipt');
  } catch (error) {
    console.error("Error updating sales receipt via API:", error);
    throw error;
  }
};

export const deleteSalesReceipt = async (receiptId: string): Promise<SalesReceipt[]> => {
  try {
    const response = await salesReceiptsAPI.delete(receiptId);
    if (response && response.success) {
      return await getSalesReceipts();
    }
    throw new Error('Failed to delete sales receipt');
  } catch (error) {
    console.error("Error deleting sales receipt via API:", error);
    throw error;
  }
};

export interface Quote {
  id: string;
  _id?: string;
  quoteNumber: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  salesperson?: any;
  salespersonId?: string;
  project?: any;
  projectId?: string;
  projectName?: string;
  date: string;
  quoteDate?: string;
  expiryDate?: string;
  items: any[];
  subTotal: number;
  subtotal: number;
  tax?: number;
  taxAmount?: number;
  taxName?: string;
  discount: number;
  discountType?: string;
  discountAccount?: string;
  shippingCharges?: number;
  shippingChargeTax?: string;
  adjustment?: number;
  roundOff?: number;
  total: number;
  amount?: number;
  currency: string;
  status: string;
  notes?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  terms?: string;
  subject?: string;
  taxExclusive?: string;
  referenceNumber?: string;
  attachedFiles?: AttachedFile[];
  comments?: QuoteComment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteComment {
  id: string | number;
  text: string;
  author: string;
  timestamp: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const mapQuoteAttachedFiles = (quote: any): AttachedFile[] => {
  if (!Array.isArray(quote?.attachedFiles)) return [];
  return quote.attachedFiles.map((file: any, index: number) => {
    const mimeType = file?.mimeType || file?.type || "";
    const fileUrl = file?.url || "";
    return {
      id: file?.documentId || file?._id || file?.id || `${quote?._id || quote?.id || 'quote'}-file-${index}`,
      name: file?.name || "Attachment",
      size: file?.size || 0,
      type: mimeType,
      mimeType,
      url: fileUrl,
      documentId: file?.documentId || file?._id || file?.id,
      uploadedAt: file?.uploadedAt || file?.createdAt || "",
      preview: mimeType.startsWith("image/") ? fileUrl : null
    };
  });
};

const mapQuoteComments = (quote: any): QuoteComment[] => {
  if (!Array.isArray(quote?.comments)) return [];
  return quote.comments
    .filter((comment: any) => comment && String(comment.text || "").trim())
    .map((comment: any, index: number) => ({
      id: comment?._id || comment?.id || `${quote?._id || quote?.id || 'quote'}-comment-${index}`,
      text: String(comment?.text || ""),
      author: comment?.author || "User",
      timestamp: comment?.timestamp || comment?.createdAt || new Date().toISOString(),
      bold: Boolean(comment?.bold),
      italic: Boolean(comment?.italic),
      underline: Boolean(comment?.underline)
    }));
};

const mapQuoteFromApi = (quote: any): Quote => {
  // Extract customer name safely
  let customerName = '';
  if (quote?.customer) {
    if (typeof quote.customer === 'object') {
      customerName = quote.customer.displayName || quote.customer.name || quote.customer.companyName || 'Unknown Customer';
    } else {
      customerName = String(quote.customer);
    }
  }

  const subtotalValue = Number(quote?.subtotal ?? quote?.subTotal ?? 0) || 0;
  const taxValue = Number(quote?.tax ?? quote?.taxAmount ?? 0) || 0;
  const taxExclusive = quote?.taxExclusive || 'Tax Exclusive';
  const taxLabel = quote?.taxName || (taxValue > 0 ? (taxExclusive === 'Tax Inclusive' ? 'Tax (Included)' : 'Tax') : '');

  return {
    id: quote?._id || quote?.id,
    _id: quote?._id,
    quoteNumber: quote?.quoteNumber,
    customerId: quote?.customer?._id || quote?.customer,
    customerName: customerName || quote?.customerName || '',
    customer: quote?.customer,
    salesperson: quote?.salesperson?.name || quote?.salesperson,
    salespersonId: quote?.salesperson?._id || quote?.salesperson,
    project: quote?.project,
    projectId: quote?.project?._id || quote?.project,
    projectName: quote?.project?.name || quote?.projectName || '',
    date: quote?.date,
    quoteDate: quote?.date,
    expiryDate: quote?.expiryDate,
    items: quote?.items || [],
    subTotal: subtotalValue,
    subtotal: subtotalValue,
    tax: taxValue,
    taxAmount: taxValue,
    taxName: taxLabel,
    discount: Number(quote?.discount || 0) || 0,
    discountType: quote?.discountType || 'percent',
    discountAccount: quote?.discountAccount || 'General Income',
    shippingCharges: Number(quote?.shippingCharges || 0) || 0,
    shippingChargeTax: String(quote?.shippingChargeTax || ''),
    adjustment: Number(quote?.adjustment || 0) || 0,
    roundOff: Number(quote?.roundOff || 0) || 0,
    total: Number(quote?.total || 0) || 0,
    currency: quote?.currency,
    status: quote?.status || 'draft',
    notes: quote?.notes || quote?.customerNotes || '',
    customerNotes: quote?.customerNotes || quote?.notes || '',
    termsAndConditions: quote?.termsAndConditions || quote?.terms || '',
    referenceNumber: quote?.referenceNumber || '',
    taxExclusive: taxExclusive,
    attachedFiles: mapQuoteAttachedFiles(quote),
    comments: mapQuoteComments(quote),
    createdAt: quote?.createdAt,
    updatedAt: quote?.updatedAt
  };
};

// Quotes Storage - Now using API instead of localStorage

export const getQuotes = async (): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.getAll();
    if (response && response.success && response.data) {
      return response.data.map((quote: any) => mapQuoteFromApi(quote));
    }
    return [];
  } catch (error) {
    console.error("Error fetching quotes from API:", error);
    // Fallback to empty array on error
    return [];
  }
};

export const getQuoteById = async (quoteId: string): Promise<Quote | null> => {
  try {
    const response = await quotesAPI.getById(quoteId);
    if (response && response.success && response.data) {
      return mapQuoteFromApi(response.data);
    }
    return null;
  } catch (error) {
    console.error("Error getting quote by ID from API:", error);
    return null;
  }
};

export const saveQuote = async (quoteData: Partial<Quote>): Promise<Quote> => {
  try {
    // Helper to normalize dates to ISO format
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        // If it's already an ISO string or a Date object that's valid
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }

        // Try parsing DD/MM/YYYY
        if (typeof dateVal === 'string' && dateVal.includes('/')) {
          const parts = dateVal.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dd = new Date(year, month, day);
            if (!isNaN(dd.getTime())) return dd.toISOString();
          }
        }
        return undefined;
      } catch (e) {
        return undefined;
      }
    };

    // Prepare data for backend API
    const apiData: any = {
      ...quoteData,
      quoteNumber: String(quoteData.quoteNumber || ''),
      customer: quoteData.customerId || quoteData.customer, // Use ID as priority
      customerId: quoteData.customerId || quoteData.customer,
      date: toISO(quoteData.quoteDate || quoteData.date) || new Date().toISOString(),
      quoteDate: toISO(quoteData.quoteDate || quoteData.date) || new Date().toISOString(),
      expiryDate: toISO(quoteData.expiryDate),
      subtotal: parseFloat(String(quoteData.subTotal || quoteData.subtotal || 0)) || 0,
      subTotal: parseFloat(String(quoteData.subTotal || quoteData.subtotal || 0)) || 0,
      tax: parseFloat(String(quoteData.tax ?? quoteData.taxAmount ?? 0)) || 0,
      discount: parseFloat(String(quoteData.discount || 0)) || 0,
      discountType: quoteData.discountType || 'percent',
      discountAccount: quoteData.discountAccount || 'General Income',
      shippingCharges: parseFloat(String(quoteData.shippingCharges || 0)) || 0,
      shippingChargeTax: String(quoteData.shippingChargeTax || ''),
      adjustment: parseFloat(String(quoteData.adjustment || 0)) || 0,
      taxExclusive: quoteData.taxExclusive || 'Tax Exclusive',
      total: parseFloat(String(quoteData.total || 0)) || 0,
      status: quoteData.status || 'draft'
    };

    // Clean up redundant fields that might cause confusion on backend
    if (apiData.quoteDate && apiData.date) delete apiData.quoteDate;

    console.log('Sending quote data to API:', apiData);
    const response = await quotesAPI.create(apiData);
    if (response && response.success && response.data) {
      return mapQuoteFromApi(response.data);
    }
    throw new Error('Failed to save quote: Invalid response from API');
  } catch (error) {
    console.error("Error saving quote to API:", error);
    throw error;
  }
};

export const updateQuote = async (quoteId: string, quoteData: Partial<Quote>): Promise<Quote> => {
  try {
    // Helper to normalize dates to ISO format
    const toISO = (dateVal: any) => {
      if (!dateVal) return undefined;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
          if (typeof dateVal === 'string' && dateVal.includes('/')) {
            const parts = dateVal.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              const dd = new Date(year, month, day);
              if (!isNaN(dd.getTime())) return dd.toISOString();
            }
          }
          return undefined;
        }
        return d.toISOString();
      } catch (e) {
        return undefined;
      }
    };

    // Prepare data for backend API without forcing defaults on partial updates
    const apiData: any = { ...quoteData };

    const normalizedQuoteDate = toISO(quoteData.quoteDate || quoteData.date);
    if (normalizedQuoteDate) {
      apiData.date = normalizedQuoteDate;
      delete apiData.quoteDate;
    }

    if (quoteData.expiryDate !== undefined) {
      apiData.expiryDate = toISO(quoteData.expiryDate) || quoteData.expiryDate;
    }

    if (quoteData.customerId !== undefined || quoteData.customer !== undefined) {
      const customerRef = quoteData.customerId || quoteData.customer;
      const customerId = typeof customerRef === 'object' && customerRef ? (customerRef._id || customerRef.id) : customerRef;
      apiData.customerId = customerId;
      apiData.customer = customerId;
    }

    if (Array.isArray(quoteData.items)) {
      apiData.items = quoteData.items.map((item: any) => ({
        ...item,
        item: typeof item.item === 'object' && item.item ? (item.item._id || item.item.id) : item.item,
        itemId: typeof item.item === 'object' && item.item ? (item.item._id || item.item.id) : (item.itemId || item.item)
      }));
    }

    // Clean up readonly fields to prevent validation errors
    delete apiData._id;
    delete apiData.createdAt;
    delete apiData.updatedAt;
    delete apiData.__v;
    delete apiData.id;

    if (quoteData.customerNotes !== undefined || quoteData.notes !== undefined) {
      apiData.customerNotes = quoteData.customerNotes ?? quoteData.notes;
    }

    if (quoteData.termsAndConditions !== undefined || quoteData.terms !== undefined) {
      apiData.termsAndConditions = quoteData.termsAndConditions ?? quoteData.terms;
    }

    if (quoteData.subTotal !== undefined || quoteData.subtotal !== undefined) {
      const subtotalValue = parseFloat(String(quoteData.subTotal ?? quoteData.subtotal ?? 0));
      apiData.subTotal = subtotalValue;
      apiData.subtotal = subtotalValue;
    }
    if (quoteData.tax !== undefined || quoteData.taxAmount !== undefined) {
      apiData.tax = parseFloat(String(quoteData.tax ?? quoteData.taxAmount ?? 0)) || 0;
    }

    if (quoteData.discountType !== undefined) {
      apiData.discountType = quoteData.discountType;
    }
    if (quoteData.discountAccount !== undefined) {
      apiData.discountAccount = quoteData.discountAccount;
    }
    if (quoteData.taxExclusive !== undefined) {
      apiData.taxExclusive = quoteData.taxExclusive;
    }
    if (quoteData.shippingCharges !== undefined) {
      apiData.shippingCharges = parseFloat(String(quoteData.shippingCharges || 0)) || 0;
    }
    if (quoteData.shippingChargeTax !== undefined) {
      apiData.shippingChargeTax = String(quoteData.shippingChargeTax || '');
    }
    if (quoteData.adjustment !== undefined) {
      apiData.adjustment = parseFloat(String(quoteData.adjustment || 0)) || 0;
    }

    const response = await quotesAPI.update(quoteId, apiData);
    if (response && response.success && response.data) {
      return mapQuoteFromApi(response.data);
    }
    throw new Error('Failed to update quote: Invalid response from API');
  } catch (error) {
    console.error("Error updating quote via API:", error);
    throw error;
  }
};

export const deleteQuote = async (quoteId: string): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.delete(quoteId);
    if (response && response.success) {
      // Return updated list
      return await getQuotes();
    }
    throw new Error('Failed to delete quote');
  } catch (error) {
    console.error("Error deleting quote via API:", error);
    throw error;
  }
};

export const deleteQuotes = async (quoteIds: string[]): Promise<Quote[]> => {
  try {
    const response = await quotesAPI.bulkDelete(quoteIds);
    if (response && response.success) {
      // Return updated list
      return await getQuotes();
    }
    throw new Error('Failed to delete quotes');
  } catch (error) {
    console.error("Error deleting quotes via API:", error);
    throw error;
  }
};

export interface Project {
  id: string;
  _id?: string;
  name?: string;
  projectName?: string;
  projectCode?: string;
  customer?: any;
  customerId?: string;
  customerName?: string;
  status?: string;
  budget?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Projects Storage
const PROJECTS_STORAGE_KEY = "taban_books_projects";

export const getProjects = async (): Promise<Project[]> => {
  return cachedFetch("projects:all", async () => {
    try {
      const response = await projectsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching projects from API:", error);
      return [];
    }
  });
};

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const response = await projectsAPI.getById(projectId);
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting project by ID from API:", error);
    return null;
  }
};

export const saveProject = async (projectData: Partial<Project>): Promise<Project> => {
  try {
    const response = await projectsAPI.create(projectData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create project");
  } catch (error) {
    console.error("Error saving project to API:", error);
    throw error;
  }
};

export const updateProject = async (projectId: string, projectData: Partial<Project>): Promise<Project | undefined> => {
  try {
    const response = await projectsAPI.update(projectId, projectData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update project");
  } catch (error) {
    console.error("Error updating project via API:", error);
    throw error;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    await projectsAPI.delete(projectId);
  } catch (error) {
    console.error("Error deleting project from API:", error);
    throw error;
  }
};

export interface Salesperson {
  id: string;
  _id?: string;
  name: string;
  email: string;
  status?: string;
}

export const getSalespersonsFromAPI = async (): Promise<Salesperson[]> => {
  return cachedFetch("salespersons:all", async () => {
    try {
      const response = await salespersonsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching salespersons from API:", error);
      return [];
    }
  });
};

export const getItemsFromAPI = async (): Promise<any[]> => {
  return cachedFetch("items:all", async () => {
    try {
      const limit = 100;
      let page = 1;
      let totalPages = 1;
      const allItems: any[] = [];

      do {
        const response = await itemsAPI.getAll({ page, limit });
        const batch = Array.isArray(response?.data) ? response.data : [];
        if (batch.length > 0) {
          allItems.push(...batch);
        }

        const paginationPages = Number((response as any)?.pagination?.pages || 0);
        if (paginationPages > 0) {
          totalPages = paginationPages;
        } else if (batch.length < limit) {
          totalPages = page;
        } else {
          totalPages = page + 1;
        }

        page += 1;
      } while (page <= totalPages && page <= 100);

      if (allItems.length > 0) {
        const byId = new Map<string, any>();
        for (const item of allItems) {
          const key = String(item?._id || item?.id || "").trim();
          if (key) {
            byId.set(key, item);
          }
        }
        return byId.size > 0 ? Array.from(byId.values()) : allItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching items from API:", error);
      return [];
    }
  });
};

// Salespersons Storage
const SALESPERSONS_STORAGE_KEY = "taban_books_salespersons";

export const getSalespersons = async (): Promise<Salesperson[]> => {
  return getSalespersonsFromAPI();
};

export const getSalespersonById = async (salespersonId: string): Promise<Salesperson | null> => {
  try {
    const response = await salespersonsAPI.getById(salespersonId);
    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting salesperson by ID from API:", error);
    return null;
  }
};

export const saveSalesperson = async (salespersonData: Partial<Salesperson>): Promise<Salesperson> => {
  try {
    const response = await salespersonsAPI.create(salespersonData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to create salesperson");
  } catch (error) {
    console.error("Error saving salesperson to API:", error);
    throw error;
  }
};

export const updateSalesperson = async (salespersonId: string, salespersonData: Partial<Salesperson>): Promise<Salesperson | undefined> => {
  try {
    const response = await salespersonsAPI.update(salespersonId, salespersonData);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error("Failed to update salesperson");
  } catch (error) {
    console.error("Error updating salesperson via API:", error);
    throw error;
  }
};

export const deleteSalesperson = async (salespersonId: string): Promise<void> => {
  try {
    await salespersonsAPI.delete(salespersonId);
  } catch (error) {
    console.error("Error deleting salesperson from API:", error);
    throw error;
  }
};

// Settings
export const getBaseCurrency = async (): Promise<string> => {
  try {
    const response = await settingsAPI.getOrganizationProfile();
    if (response && response.success && response.data) {
      return response.data.baseCurrency || 'USD';
    }
    return 'USD';
  } catch (error) {
    console.error('Error fetching base currency:', error);
    return 'USD';
  }
};

export const getPlansFromAPI = async (): Promise<any[]> => {
  return cachedFetch("plans:all", async () => {
    try {
      const response = await plansAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching plans from API:", error);
      return [];
    }
  });
};

export interface ReportingTag {
  id: string;
  _id?: string;
  name: string;
  status?: string;
}

export const getReportingTagsFromAPI = async (): Promise<ReportingTag[]> => {
  return cachedFetch("reportingTags:all", async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      if (response && response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching reporting tags from API:", error);
      return [];
    }
  });
};
