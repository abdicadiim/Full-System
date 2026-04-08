import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { recurringExpensesAPI, currenciesAPI, taxesAPI } from "../../../services/api";
import { computeRecurringExpenseDisplayAmount } from "../shared/recurringExpenseModel";

const extractCurrencies = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const normalizeRecurringExpense = (expense: any, options: { baseCurrencyCode?: string; currencies: any[] }) => {
  const { baseCurrencyCode, currencies } = options;
  const baseCurrency = String(baseCurrencyCode || "USD").trim();
  const currencySymbol = (() => {
    const currencyStr = baseCurrency || expense.currency_code || "USD";
    const code = currencyStr.split(" - ")[0];
    const match = currencies.find((c: any) => c.code === code || c.code === currencyStr);
    return match ? match.symbol : code || currencyStr;
  })();

  const tags = Array.isArray(expense.reporting_tags) ? expense.reporting_tags : [];
  const wsqTag = tags.find((tag: any) =>
    String(tag?.name || tag?.tagName || "").trim().toLowerCase() === "wsq"
  );

  return {
    ...expense,
    id: expense._id || expense.recurring_expense_id,
    recurringExpenseId: expense.recurring_expense_id || expense._id,
    profileName: expense.profile_name,
    location: expense.location || expense.location_name || "",
    expenseAccount: expense.account_name,
    vendor: expense.vendor_name || "",
    repeatEvery: expense.repeat_every,
    startDate: expense.start_date,
    amount: expense.amount,
    taxName: expense.tax_name || expense.taxName || "",
    taxId: expense.tax_id || expense.taxId || "",
    taxRate: Number(expense.tax_percentage ?? expense.taxPercentage ?? expense.rate ?? 0),
    isInclusiveTax: Boolean(expense.is_inclusive_tax),
    displayAmount: computeRecurringExpenseDisplayAmount(
      expense.amount,
      Number(expense.tax_percentage ?? expense.taxPercentage ?? expense.rate ?? 0),
      Boolean(expense.is_inclusive_tax)
    ),
    currency: baseCurrency || expense.currency_code || "USD",
    currencySymbol,
    status: (expense.status || "active").toUpperCase(),
    active: expense.status !== "stopped" && expense.status !== "expired",
    createdTime: expense.created_time || expense.createdAt,
    description: expense.description,
    customerName: expense.customer_name,
    nextExpenseDate: expense.next_expense_date,
    wsq: wsqTag?.value || expense?.wsq || "",
  };
};

export const recurringExpensesQueryKeys = {
  list: (currencyCode?: string) => ["recurring-expenses", "list", String(currencyCode || "USD")] as const,
};

export const fetchRecurringExpensesList = async (options?: { baseCurrencyCode?: string }) => {
  const currencyCode = String(options?.baseCurrencyCode || "USD").trim();

  const [response, currenciesResponse, primaryTaxResponse, fallbackTaxResponse] = await Promise.all([
    recurringExpensesAPI.getAll({ limit: 1000 }),
    currenciesAPI.getAll(),
    taxesAPI.getForTransactions().catch(() => null),
    taxesAPI.getAll({ status: "active" }).catch(() => null),
  ]);

  const currencies = extractCurrencies(currenciesResponse);

  const taxRows =
    (Array.isArray(primaryTaxResponse?.data) ? primaryTaxResponse.data : []) ||
    (Array.isArray(fallbackTaxResponse?.data) ? fallbackTaxResponse.data : []);
  const taxRates: Record<string, number> = {};
  taxRows.forEach((row: any) => {
    const key = String(row?.id || row?._id || row?.tax_id || row?.taxId || row?.name || row?.taxName || "");
    if (key) {
      taxRates[key] = Number(row?.rate ?? row?.percentage ?? row?.tax_percentage ?? row?.taxPercentage ?? 0);
    }
  });

  const mappedExpenses: any[] = [];
  if (response && response.recurring_expenses) {
    response.recurring_expenses.forEach((expense: any) => {
      mappedExpenses.push(
        normalizeRecurringExpense(expense, { baseCurrencyCode: currencyCode, currencies })
      );
    });
  }

  return {
    recurringExpenses: mappedExpenses,
    currencies,
    taxRates,
  };
};

export const useRecurringExpensesQuery = (options?: { baseCurrencyCode?: string; enabled?: boolean }) =>
  useQuery({
    queryKey: recurringExpensesQueryKeys.list(options?.baseCurrencyCode),
    queryFn: () => fetchRecurringExpensesList(options),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
