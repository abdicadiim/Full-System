import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { expensesAPI, vendorsAPI, customersAPI, chartOfAccountsAPI, bankAccountsAPI, currenciesAPI } from "../../../services/api";

const extractCollection = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.vendors)) return response.vendors;
  if (Array.isArray(response?.customers)) return response.customers;
  if (Array.isArray(response?.accounts)) return response.accounts;
  return [];
};

export const expensesQueryKeys = {
  list: (params?: ExpensesQueryParams) =>
    ["expenses", "list", String(params?.baseCurrencyCode || "USD")] as const,
};

export type ExpensesQueryResult = {
  expenses: any[];
  vendors: any[];
  customers: any[];
  accounts: any[];
  currencies: any[];
};

export type ExpensesQueryParams = {
  baseCurrencyCode?: string;
};

const getDefaultCurrency = (params?: ExpensesQueryParams) =>
  String(params?.baseCurrencyCode || "USD").trim() || "USD";

export const fetchExpensesList = async (params?: ExpensesQueryParams): Promise<ExpensesQueryResult> => {
  const baseCurrency = getDefaultCurrency(params);
  const [
    response,
    vendorsResponse,
    customersResponse,
    accountsResponse,
    bankAccountsResponse,
    cursResp,
  ] = await Promise.all([
    expensesAPI.getAll({ limit: 1000 }),
    vendorsAPI.getAll({ limit: 1000 }),
    customersAPI.getAll({ limit: 1000 }),
    chartOfAccountsAPI.getAccounts({ limit: 1000 }),
    bankAccountsAPI.getAll({ limit: 1000 }),
    currenciesAPI.getAll(),
  ]);

  const vendors = extractCollection(vendorsResponse);
  const customers = extractCollection(customersResponse);
  const chartAccounts = extractCollection(accountsResponse);
  const bankAccounts = extractCollection(bankAccountsResponse);
  const cursList = Array.isArray(cursResp) ? cursResp : response?.data || [];

  const mergedAccountsMap = new Map<string, any>();
  [...chartAccounts, ...bankAccounts].forEach((account: any) => {
    const id = String(account?._id || account?.id || "");
    const name = String(account?.accountName || account?.name || "").trim();
    const mapKey = id || name.toLowerCase();
    if (!mapKey) return;
    if (!mergedAccountsMap.has(mapKey)) {
      mergedAccountsMap.set(mapKey, account);
    }
  });
  const accounts = Array.from(mergedAccountsMap.values());

  const mappedExpenses: any[] = [];
  if (response && (response.code === 0 || response.success) && (response.expenses || response.data)) {
    const apiExpenses = response.expenses || response.data || [];

    const vendorById = new Map<string, any>(
      vendors
        .map((v: any) => [String(v?._id || v?.id || ""), v] as [string, any])
        .filter(([id]) => Boolean(id))
    );
    const customerById = new Map<string, any>(
      customers
        .map((c: any) => [String(c?._id || c?.id || ""), c] as [string, any])
        .filter(([id]) => Boolean(id))
    );
    const accountById = new Map<string, any>(
      accounts
        .map((a: any) => [String(a?._id || a?.id || ""), a] as [string, any])
        .filter(([id]) => Boolean(id))
    );

    const hasAnyAttachment = (expense: any) => {
      const listKeys = ["receipts", "uploads", "documents", "attachments", "files"];
      const valueKeys = ["receipt", "receiptFile", "receiptUrl", "document", "documentFile", "documentUrl"];
      const hasList = listKeys.some((key) => Array.isArray(expense?.[key]) && expense[key].length > 0);
      const hasValue = valueKeys.some((key) => Boolean(expense?.[key]));
      return expense?.hasReceipt === true || hasList || hasValue;
    };

    apiExpenses.forEach((expense: any) => {
      const vendor = vendorById.get(String(expense.vendor_id || ""));
      const customer = customerById.get(String(expense.customer_id || ""));
      const paidThroughAccount = accountById.get(String(expense.paid_through_account_id || ""));
      const expenseAccount = accountById.get(String(expense.account_id || ""));
      const vendorName = expense.vendor_name || expense.vendorName || expense.vendor?.name || vendor?.displayName || vendor?.name || "";
      const customerName = expense.customer_name || expense.customerName || expense.customer?.name || customer?.displayName || customer?.name || "";
      const paidThroughName = expense.paid_through_account_name || expense.paidThrough || paidThroughAccount?.accountName || "";

      mappedExpenses.push({
        ...expense,
        id: expense.expense_id || expense._id || expense.id,
        date: expense.date ? new Date(expense.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
        expenseAccount: expense.account_name || expenseAccount?.accountName || "",
        amount: expense.total ?? expense.amount ?? expense.sub_total ?? 0,
        currency: baseCurrency || expense.currency_code || "USD",
        currencySymbol: (() => {
          const currencyStr = baseCurrency || expense.currency_code || "USD";
          const code = currencyStr.split(" - ")[0];
          const match = cursList.find((c: any) => c.code === code || c.code === currencyStr);
          return match ? match.symbol : code || currencyStr;
        })(),
        paidThrough: paidThroughName || "",
        vendor: vendorName || "",
        reference: expense.reference_number,
        location: expense.location_name || expense.location || "Head Office",
        customerName: customerName || "",
        status: (expense.status || "").toUpperCase(),
        notes: expense.description,
        hasAttachment: hasAnyAttachment(expense),
      });
    });
  }

  return {
    expenses: mappedExpenses,
    vendors,
    customers,
    accounts,
    currencies: cursList,
  };
};

export const useExpensesQuery = (params?: ExpensesQueryParams, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: expensesQueryKeys.list(params),
    queryFn: () => fetchExpensesList(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
