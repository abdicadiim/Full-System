import { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import {
  billsAPI,
  creditNotesAPI,
  currenciesAPI,
  customersAPI,
  expensesAPI,
  invoicesAPI,
  journalEntriesAPI,
  paymentsMadeAPI,
  paymentsReceivedAPI,
  projectsAPI,
  purchaseOrdersAPI,
  quotesAPI,
  recurringExpensesAPI,
  recurringInvoicesAPI,
  reportingTagsAPI,
  salesReceiptsAPI,
  senderEmailsAPI,
  vendorCreditsAPI,
  vendorsAPI,
} from "../../../services/api";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import type { Transaction } from "./customerDetailTypes";

const mapCustomerRecord = (customerData: any, normalizeComments: (value: any) => any[]) => {
  let customerName = customerData.displayName || customerData.name;
  if (!customerName || customerName.trim() === "") {
    const firstName = customerData.firstName || "";
    const lastName = customerData.lastName || "";
    const companyName = customerData.companyName || "";

    if (firstName || lastName) {
      customerName = `${firstName} ${lastName}`.trim();
    } else if (companyName) {
      customerName = companyName.trim();
    } else {
      customerName = "Customer";
    }
  }

  customerName = customerName.trim() || "Customer";
  const normalizedComments = normalizeComments(customerData.comments);

  return {
    normalizedComments,
    mappedCustomer: {
      ...customerData,
      id: String(customerData._id || customerData.id),
      name: customerName,
      displayName: customerData.displayName || customerName,
      billingAttention: customerData.billingAddress?.attention || customerData.billingAttention || "",
      billingCountry: customerData.billingAddress?.country || customerData.billingCountry || "",
      billingStreet1: customerData.billingAddress?.street1 || customerData.billingStreet1 || "",
      billingStreet2: customerData.billingAddress?.street2 || customerData.billingStreet2 || "",
      billingCity: customerData.billingAddress?.city || customerData.billingCity || "",
      billingState: customerData.billingAddress?.state || customerData.billingState || "",
      billingZipCode: customerData.billingAddress?.zipCode || customerData.billingZipCode || "",
      billingPhone: customerData.billingAddress?.phone || customerData.billingPhone || "",
      billingFax: customerData.billingAddress?.fax || customerData.billingFax || "",
      shippingAttention: customerData.shippingAddress?.attention || customerData.shippingAttention || "",
      shippingCountry: customerData.shippingAddress?.country || customerData.shippingCountry || "",
      shippingStreet1: customerData.shippingAddress?.street1 || customerData.shippingStreet1 || "",
      shippingStreet2: customerData.shippingAddress?.street2 || customerData.shippingStreet2 || "",
      shippingCity: customerData.shippingAddress?.city || customerData.shippingCity || "",
      shippingState: customerData.shippingAddress?.state || customerData.shippingState || "",
      shippingZipCode: customerData.shippingAddress?.zipCode || customerData.shippingZipCode || "",
      shippingPhone: customerData.shippingAddress?.phone || customerData.shippingPhone || "",
      shippingFax: customerData.shippingAddress?.fax || customerData.shippingFax || "",
      remarks: customerData.remarks || customerData.notes || "",
      comments: normalizedComments,
    },
  };
};

const mapSidebarCustomers = (rows: any[]) =>
  rows.map((row: any) => ({
    ...row,
    id: String(row._id || row.id),
    name: row.displayName || row.name,
  }));

const mapVendorRows = (rows: any[]) =>
  rows.map((row: any) => ({
    ...row,
    id: String(row._id || row.id),
    name: row.displayName || row.vendorName || row.companyName || row.name,
  }));

const filterRowsByCustomerId = (rows: any[], customerId: string) =>
  rows.filter((row: any) => {
    const rowCustomerId = String(row.customerId || row.customer?._id || row.customer || "").trim();
    return rowCustomerId === customerId;
  });

export default function useCustomerDetailData(args: any) {
  const {
    id,
    locationKey,
    navigate,
    activeTab,
    customer,
    linkedVendor,
    organizationProfile,
    normalizeComments,
    mapDocumentsToAttachments,
    invoices,
    payments,
    creditNotes,
    setOrganizationProfile,
    setOwnerEmail,
    setIsRefreshing,
    setCustomer,
    setComments,
    setAttachments,
    setInvoices,
    setPayments,
    setCreditNotes,
    setAvailableCurrencies,
    setCustomers,
    setQuotes,
    setRecurringInvoices,
    setExpenses,
    setRecurringExpenses,
    setProjects,
    setBills,
    setSalesReceipts,
    setJournals,
    setVendors,
    setLinkedVendor,
    setLoading,
    setLinkedVendorPurchases,
    setLinkedVendorPaymentsMade,
    setLinkedVendorPurchaseOrders,
    setLinkedVendorCredits,
    setIsLinkedVendorPurchasesLoading,
    setActiveTab,
    setStatementTransactions,
  } = args;

  const fetchOrganizationProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        const fallbackProfile = localStorage.getItem("organization_profile");
        if (fallbackProfile) {
          setOrganizationProfile(JSON.parse(fallbackProfile));
        }
        return;
      }

      const response = await fetch("/api/settings/organization/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          localStorage.setItem("organization_profile", JSON.stringify(data.data));
        }
        return;
      }

      const fallbackProfile = localStorage.getItem("organization_profile");
      if (fallbackProfile) {
        setOrganizationProfile(JSON.parse(fallbackProfile));
      }
    } catch {
      const fallbackProfile = localStorage.getItem("organization_profile");
      if (fallbackProfile) {
        setOrganizationProfile(JSON.parse(fallbackProfile));
      }
    }
  }, [setOrganizationProfile]);

  const fetchOwnerEmail = useCallback(async () => {
    try {
      const primarySenderRes = await senderEmailsAPI.getPrimary();
      const fallbackName = String(organizationProfile?.name || "Taban Enterprise").trim() || "Taban Enterprise";
      const fallbackEmail = String(organizationProfile?.email || "").trim();
      setOwnerEmail(resolveVerifiedPrimarySender(primarySenderRes, fallbackName, fallbackEmail));
    } catch {
    }
  }, [organizationProfile, setOwnerEmail]);

  const refreshData = useCallback(async () => {
    if (!id) return;

    setIsRefreshing(true);
    try {
      const customerId = String(id).trim();

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
        vendorsResponse,
      ] = await Promise.all([
        customersAPI.getById(customerId),
        currenciesAPI.getAll(),
        customersAPI.getAll({ limit: 1000 }),
        invoicesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
        paymentsReceivedAPI.getByInvoice(customerId).catch(() => ({ success: true, data: [] })),
        creditNotesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
        quotesAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
        recurringInvoicesAPI.getAll().catch(() => ({ success: true, data: [] })),
        expensesAPI.getAll().catch(() => ({ success: true, data: [] })),
        recurringExpensesAPI.getAll().catch(() => ({ success: true, data: [] })),
        projectsAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
        billsAPI.getAll().catch(() => ({ success: true, data: [] })),
        salesReceiptsAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
        journalEntriesAPI.getAll().catch(() => ({ success: true, data: [] })),
        vendorsAPI.getAll().catch(() => ({ success: true, data: [] })),
      ]);

      if (customerResponse && customerResponse.success && customerResponse.data) {
        const { mappedCustomer, normalizedComments } = mapCustomerRecord(customerResponse.data, normalizeComments);
        setCustomer(mappedCustomer);
        setComments(normalizedComments);
        setAttachments(mapDocumentsToAttachments(customerResponse.data.documents || []));
      } else {
        navigate("/sales/customers");
        return;
      }

      const canonicalCustomerId = String(customerResponse?.data?.id || customerResponse?.data?._id || "").trim();

      setInvoices(
        invoicesResponse?.success && Array.isArray(invoicesResponse.data)
          ? filterRowsByCustomerId(invoicesResponse.data, canonicalCustomerId)
          : [],
      );

      setPayments(
        paymentsResponse?.success && Array.isArray(paymentsResponse.data)
          ? filterRowsByCustomerId(paymentsResponse.data, canonicalCustomerId)
          : [],
      );

      setCreditNotes(
        creditNotesResponse?.success && Array.isArray(creditNotesResponse.data)
          ? filterRowsByCustomerId(creditNotesResponse.data, canonicalCustomerId)
          : [],
      );

      if (Array.isArray(currenciesData)) {
        setAvailableCurrencies(currenciesData.filter((row: any) => row.status === "active"));
      }

      if (customersResponse?.success && Array.isArray(customersResponse.data)) {
        setCustomers(mapSidebarCustomers(customersResponse.data));
      }

      if (quotesResponse?.success && Array.isArray(quotesResponse.data)) {
        setQuotes(quotesResponse.data);
      }

      if (recurringInvoicesResponse?.success && Array.isArray(recurringInvoicesResponse.data)) {
        setRecurringInvoices(filterRowsByCustomerId(recurringInvoicesResponse.data, customerId));
      }

      if (expensesResponse?.success && Array.isArray(expensesResponse.data)) {
        setExpenses(filterRowsByCustomerId(expensesResponse.data, customerId));
      }

      if (recurringExpensesResponse?.success && Array.isArray(recurringExpensesResponse.data)) {
        setRecurringExpenses(filterRowsByCustomerId(recurringExpensesResponse.data, customerId));
      }

      if (projectsResponse?.success && Array.isArray(projectsResponse.data)) {
        setProjects(projectsResponse.data);
      }

      if (billsResponse?.success && Array.isArray(billsResponse.data)) {
        setBills(filterRowsByCustomerId(billsResponse.data, customerId));
      }

      if (salesReceiptsResponse?.success && Array.isArray(salesReceiptsResponse.data)) {
        setSalesReceipts(salesReceiptsResponse.data);
      }

      if (journalsResponse?.success && Array.isArray(journalsResponse.data)) {
        setJournals(filterRowsByCustomerId(journalsResponse.data, customerId));
      }

      if (vendorsResponse?.success && Array.isArray(vendorsResponse.data)) {
        const mappedVendors = mapVendorRows(vendorsResponse.data);
        setVendors(mappedVendors);
        if (customerResponse?.data?.linkedVendorId) {
          const foundVendor = mappedVendors.find(
            (row: any) => String(row.id) === String(customerResponse.data.linkedVendorId),
          );
          setLinkedVendor(foundVendor || null);
        } else {
          setLinkedVendor(null);
        }
      }
    } catch (error: any) {
      toast.error("Failed to refresh customer data: " + (error.message || "Unknown error"));
    } finally {
      setIsRefreshing(false);
    }
  }, [
    id,
    navigate,
    normalizeComments,
    mapDocumentsToAttachments,
    setIsRefreshing,
    setCustomer,
    setComments,
    setAttachments,
    setInvoices,
    setPayments,
    setCreditNotes,
    setAvailableCurrencies,
    setCustomers,
    setQuotes,
    setRecurringInvoices,
    setExpenses,
    setRecurringExpenses,
    setProjects,
    setBills,
    setSalesReceipts,
    setJournals,
    setVendors,
    setLinkedVendor,
  ]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      if (!id) return;

      const customerId = String(id).trim();
      const prefill = args.initialCustomer || null;
      const prefillId = prefill ? String(prefill._id || prefill.id || "").trim() : "";

      if (prefill && prefillId && prefillId === customerId) {
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
          displayName: prefill.displayName || prefillName,
        });
        setComments(normalizeComments(prefill.comments));
        setLoading(false);
      } else {
        setCustomer(null);
        setComments([]);
        setLoading(true);
      }

      try {
        const [customerResponse, currenciesData, customersResponse] = await Promise.all([
          customersAPI.getById(customerId),
          currenciesAPI.getAll(),
          customersAPI.getAll({ limit: 1000 }),
        ]);

        if (customerResponse && customerResponse.success && customerResponse.data) {
          const { mappedCustomer, normalizedComments } = mapCustomerRecord(customerResponse.data, normalizeComments);
          setCustomer(mappedCustomer);
          setComments(normalizedComments);
          setAttachments(mapDocumentsToAttachments(customerResponse.data.documents || []));
        } else {
          navigate("/sales/customers");
          return;
        }

        if (Array.isArray(currenciesData)) {
          setAvailableCurrencies(currenciesData.filter((row: any) => row.status === "active"));
        }

        if (customersResponse?.success && Array.isArray(customersResponse.data)) {
          setCustomers(mapSidebarCustomers(customersResponse.data));
        }

        if (!isActive) return;
        setLoading(false);

        const canonicalCustomerId = String(customerResponse?.data?._id || customerResponse?.data?.id || customerId).trim();
        const linkedVendorId = String(customerResponse?.data?.linkedVendorId || "").trim();

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
              vendorsResponse,
            ] = await Promise.all([
              invoicesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
              paymentsReceivedAPI.getByInvoice(customerId).catch(() => ({ success: true, data: [] })),
              creditNotesAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
              quotesAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
              recurringInvoicesAPI.getAll().catch(() => ({ success: true, data: [] })),
              expensesAPI.getAll().catch(() => ({ success: true, data: [] })),
              recurringExpensesAPI.getAll().catch(() => ({ success: true, data: [] })),
              projectsAPI.getByCustomer(customerId).catch(() => ({ success: true, data: [] })),
              billsAPI.getAll().catch(() => ({ success: true, data: [] })),
              salesReceiptsAPI.getAll({ customerId }).catch(() => ({ success: true, data: [] })),
              journalEntriesAPI.getAll().catch(() => ({ success: true, data: [] })),
              vendorsAPI.getAll().catch(() => ({ success: true, data: [] })),
            ]);

            if (!isActive) return;

            setInvoices(
              invoicesResponse?.success && Array.isArray(invoicesResponse.data)
                ? filterRowsByCustomerId(invoicesResponse.data, canonicalCustomerId)
                : [],
            );

            setPayments(
              paymentsResponse?.success && Array.isArray(paymentsResponse.data)
                ? filterRowsByCustomerId(paymentsResponse.data, canonicalCustomerId)
                : [],
            );

            setCreditNotes(
              creditNotesResponse?.success && Array.isArray(creditNotesResponse.data)
                ? filterRowsByCustomerId(creditNotesResponse.data, canonicalCustomerId)
                : [],
            );

            if (quotesResponse?.success && Array.isArray(quotesResponse.data)) {
              setQuotes(quotesResponse.data);
            }

            if (recurringInvoicesResponse?.success && Array.isArray(recurringInvoicesResponse.data)) {
              setRecurringInvoices(filterRowsByCustomerId(recurringInvoicesResponse.data, canonicalCustomerId));
            }

            if (expensesResponse?.success && Array.isArray(expensesResponse.data)) {
              setExpenses(filterRowsByCustomerId(expensesResponse.data, canonicalCustomerId));
            }

            if (recurringExpensesResponse?.success && Array.isArray(recurringExpensesResponse.data)) {
              setRecurringExpenses(filterRowsByCustomerId(recurringExpensesResponse.data, canonicalCustomerId));
            }

            if (projectsResponse?.success && Array.isArray(projectsResponse.data)) {
              setProjects(projectsResponse.data);
            }

            if (billsResponse?.success && Array.isArray(billsResponse.data)) {
              setBills(filterRowsByCustomerId(billsResponse.data, canonicalCustomerId));
            }

            if (salesReceiptsResponse?.success && Array.isArray(salesReceiptsResponse.data)) {
              setSalesReceipts(salesReceiptsResponse.data);
            }

            if (journalsResponse?.success && Array.isArray(journalsResponse.data)) {
              setJournals(filterRowsByCustomerId(journalsResponse.data, canonicalCustomerId));
            }

            if (vendorsResponse?.success && Array.isArray(vendorsResponse.data)) {
              const mappedVendors = mapVendorRows(vendorsResponse.data);
              setVendors(mappedVendors);
              if (linkedVendorId) {
                const foundVendor = mappedVendors.find((row: any) => String(row.id) === linkedVendorId);
                setLinkedVendor(foundVendor || null);
              } else {
                setLinkedVendor(null);
              }
            }
          } catch (error: any) {
            if (!isActive) return;
            toast.error("Failed to load customer details: " + (error.message || "Unknown error"));
          }
        };

        loadSupplementaryData();
      } catch (error: any) {
        if (!isActive) return;
        toast.error("Error loading customer: " + (error.message || "Unknown error"));
        navigate("/sales/customers");
      }
    };

    loadData();
    fetchOrganizationProfile();
    fetchOwnerEmail();

    return () => {
      isActive = false;
    };
  }, [
    id,
    locationKey,
    args.initialCustomer,
    navigate,
    normalizeComments,
    mapDocumentsToAttachments,
    fetchOrganizationProfile,
    fetchOwnerEmail,
    setCustomer,
    setComments,
    setLoading,
    setAttachments,
    setAvailableCurrencies,
    setCustomers,
    setInvoices,
    setPayments,
    setCreditNotes,
    setQuotes,
    setRecurringInvoices,
    setExpenses,
    setRecurringExpenses,
    setProjects,
    setBills,
    setSalesReceipts,
    setJournals,
    setVendors,
    setLinkedVendor,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
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
          const rowVendorId = String(row.vendorId || row.vendor?._id || row.vendor || row.vendor_id || "").trim();
          if (rowVendorId && rowVendorId === linkedVendorId) return true;

          const rowVendorName = String(row.vendorName || row.vendor_name || row.vendor?.name || "").toLowerCase().trim();
          return Boolean(
            linkedVendorName &&
              rowVendorName &&
              (rowVendorName === linkedVendorName ||
                rowVendorName.includes(linkedVendorName) ||
                linkedVendorName.includes(rowVendorName)),
          );
        };

        const [billsByVendorResponse, allBillsResponse, paymentsMadeResponse, purchaseOrdersResponse, vendorCreditsResponse] =
          await Promise.all([
            billsAPI.getByVendor(linkedVendorId).catch(() => null),
            billsAPI.getAll().catch(() => ({ data: [] })),
            paymentsMadeAPI.getAll().catch(() => ({ data: [] })),
            purchaseOrdersAPI.getAll().catch(() => ({ data: [] })),
            vendorCreditsAPI.getAll().catch(() => ({ data: [] })),
          ]);

        let vendorBills: any[] = Array.isArray(billsByVendorResponse?.data)
          ? billsByVendorResponse.data
          : Array.isArray(billsByVendorResponse)
            ? billsByVendorResponse
            : [];

        if (vendorBills.length === 0) {
          const allBills = Array.isArray(allBillsResponse?.data)
            ? allBillsResponse.data
            : Array.isArray(allBillsResponse)
              ? allBillsResponse
              : [];
          vendorBills = allBills.filter(matchesLinkedVendor);
        }

        const allPaymentsMade = Array.isArray(paymentsMadeResponse?.data)
          ? paymentsMadeResponse.data
          : Array.isArray(paymentsMadeResponse)
            ? paymentsMadeResponse
            : [];
        const allPurchaseOrders = Array.isArray(purchaseOrdersResponse?.data)
          ? purchaseOrdersResponse.data
          : Array.isArray(purchaseOrdersResponse)
            ? purchaseOrdersResponse
            : [];
        const allVendorCredits = Array.isArray(vendorCreditsResponse?.data)
          ? vendorCreditsResponse.data
          : Array.isArray(vendorCreditsResponse)
            ? vendorCreditsResponse
            : [];

        if (isActive) {
          setLinkedVendorPurchases(vendorBills);
          setLinkedVendorPaymentsMade(allPaymentsMade.filter(matchesLinkedVendor));
          setLinkedVendorPurchaseOrders(allPurchaseOrders.filter(matchesLinkedVendor));
          setLinkedVendorCredits(allVendorCredits.filter(matchesLinkedVendor));
        }
      } catch {
        if (isActive) {
          setLinkedVendorPurchases([]);
          setLinkedVendorPaymentsMade([]);
          setLinkedVendorPurchaseOrders([]);
          setLinkedVendorCredits([]);
        }
      } finally {
        if (isActive) {
          setIsLinkedVendorPurchasesLoading(false);
        }
      }
    };

    loadLinkedVendorPurchases();
    return () => {
      isActive = false;
    };
  }, [
    customer?.linkedVendorId,
    customer?.linkedVendorName,
    linkedVendor?.name,
    setLinkedVendorPurchases,
    setLinkedVendorPaymentsMade,
    setLinkedVendorPurchaseOrders,
    setLinkedVendorCredits,
    setIsLinkedVendorPurchasesLoading,
  ]);

  useEffect(() => {
    if (activeTab === "purchases" && !customer?.linkedVendorId) {
      setActiveTab("overview");
    }
  }, [activeTab, customer?.linkedVendorId, setActiveTab]);

  useEffect(() => {
    if (!customer) {
      setStatementTransactions([]);
      return;
    }

    const transactions: Transaction[] = [
      {
        id: "opening",
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        type: "Opening Balance",
        details: "***Opening Balance***",
        amount: parseFloat(String(customer.openingBalance || 0)),
        payments: 0,
        balance: parseFloat(String(customer.openingBalance || 0)),
      },
    ];

    payments.forEach((payment: any) => {
      transactions.push({
        id: `payment-${payment.id}`,
        date: payment.paymentDate || payment.date || new Date().toISOString(),
        type: "Payment Received",
        details: `${payment.paymentNumber || payment.id}\nAMD${parseFloat(
          String(payment.amountReceived || payment.amount || 0),
        ).toLocaleString()} in excess payments`,
        detailsLink: payment.paymentNumber || payment.id,
        amount: 0,
        payments: parseFloat(String(payment.amountReceived || payment.amount || 0)),
        balance: 0,
      });
    });

    creditNotes.forEach((creditNote: any) => {
      transactions.push({
        id: `cn-${creditNote.id}`,
        date: creditNote.date || creditNote.creditNoteDate || new Date().toISOString(),
        type: "Credit Note",
        details: creditNote.creditNoteNumber || creditNote.id,
        detailsLink: creditNote.creditNoteNumber || creditNote.id,
        amount: -parseFloat(String(creditNote.total || creditNote.amount || 0)),
        payments: 0,
        balance: 0,
      });
    });

    invoices.forEach((invoice: any) => {
      transactions.push({
        id: `inv-${invoice.id}`,
        date: invoice.date || invoice.invoiceDate || new Date().toISOString(),
        type: "Invoice",
        details: invoice.invoiceNumber || invoice.id,
        detailsLink: invoice.invoiceNumber || invoice.id,
        amount: parseFloat(String(invoice.total || invoice.amount || 0)),
        payments: 0,
        balance: 0,
      });
    });

    transactions.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

    let runningBalance = 0;
    transactions.forEach((transaction) => {
      runningBalance = runningBalance + transaction.amount - transaction.payments;
      transaction.balance = runningBalance;
    });

    setStatementTransactions(transactions);
  }, [customer, invoices, payments, creditNotes, setStatementTransactions]);

  useEffect(() => {
    const handleCustomerUpdated = (event: any) => {
      if (event.detail?.customer && id) {
        const updatedCustomerId = String(event.detail.customer._id || event.detail.customer.id);
        const currentCustomerId = String(id);
        if (updatedCustomerId === currentCustomerId) {
          refreshData();
          toast.success("Customer data refreshed");
        }
      }
    };

    window.addEventListener("customersUpdated", handleCustomerUpdated);
    return () => {
      window.removeEventListener("customersUpdated", handleCustomerUpdated);
    };
  }, [id, refreshData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        refreshData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, refreshData]);

  return { refreshData };
}
