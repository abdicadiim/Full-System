import React from "react";
import { AlertTriangle, ChevronDown, Plus } from "lucide-react";
import CustomerDetailOverviewActivity from "./CustomerDetailOverviewActivity";

type CustomerDetailOverviewContentProps = {
  customer: any;
  id?: string;
  availableCurrencies: any[];
  formatCurrency: (amount: any, currency?: string) => string;
  linkedVendor: any;
  customerSubscriptions: any[];
  subscriptionDropdownRef: React.RefObject<HTMLDivElement | null>;
  isSubscriptionDropdownOpen: boolean;
  setIsSubscriptionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navigate: (to: string, options?: any) => void;
  formatDateForDisplay: (date: string | Date) => string;
  incomeTimePeriodRef: React.RefObject<HTMLDivElement | null>;
  incomeTimePeriod: string;
  isIncomeTimePeriodDropdownOpen: boolean;
  setIsIncomeTimePeriodDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIncomeTimePeriod: React.Dispatch<React.SetStateAction<string>>;
  invoices: any[];
  payments: any[];
  accountingBasis: string;
  quotes: any[];
  creditNotes: any[];
  salesReceipts: any[];
  recurringInvoices: any[];
};

const getCreditLimitText = (customer: any, formatCurrency: (amount: any, currency?: string) => string) => {
  const raw = customer?.creditLimit ?? customer?.credit_limit ?? customer?.creditlimit ?? customer?.creditLimitAmount ?? "";
  const asString = String(raw ?? "").trim();
  if (!asString || asString.toLowerCase() === "unlimited") return "Unlimited";
  const value = Number(asString);
  if (!Number.isFinite(value)) return asString;
  return formatCurrency(value, customer?.currency || "USD");
};

export default function CustomerDetailOverviewContent({
  customer,
  id,
  availableCurrencies,
  formatCurrency,
  linkedVendor,
  customerSubscriptions,
  subscriptionDropdownRef,
  isSubscriptionDropdownOpen,
  setIsSubscriptionDropdownOpen,
  navigate,
  formatDateForDisplay,
  incomeTimePeriodRef,
  incomeTimePeriod,
  isIncomeTimePeriodDropdownOpen,
  setIsIncomeTimePeriodDropdownOpen,
  setIncomeTimePeriod,
  invoices,
  payments,
  accountingBasis,
  quotes,
  creditNotes,
  salesReceipts,
  recurringInvoices,
}: CustomerDetailOverviewContentProps) {
  const customerId = String(customer?.id || customer?._id || "").trim();
  const customerName = String(customer?.name || customer?.displayName || customer?.companyName || "").trim();
  const receivablesValue = Number((customer as any)?.receivables ?? 0);
  const creditLimitRaw = (customer as any)?.creditLimit ?? (customer as any)?.credit_limit ?? (customer as any)?.creditlimit ?? (customer as any)?.creditLimitAmount ?? "";
  const creditLimitValue = Number(String(creditLimitRaw ?? "").trim());
  const showCreditLimitWarning =
    String(creditLimitRaw ?? "").trim() &&
    String(creditLimitRaw ?? "").trim().toLowerCase() !== "unlimited" &&
    Number.isFinite(creditLimitValue) &&
    Number.isFinite(receivablesValue) &&
    receivablesValue > creditLimitValue;

  const filteredInvoices = (() => {
    const now = new Date();
    let nextInvoices = [...invoices];

    if (incomeTimePeriod === "This Fiscal Year") {
      const fiscalYearStart = new Date(now.getFullYear(), 6, 1);
      nextInvoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.date || invoice.createdAt);
        return invoiceDate >= fiscalYearStart && invoiceDate <= now;
      });
    } else if (incomeTimePeriod === "Previous Fiscal Year") {
      const previousYearStart = new Date(now.getFullYear() - 1, 6, 1);
      const previousYearEnd = new Date(now.getFullYear(), 5, 30);
      nextInvoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.date || invoice.createdAt);
        return invoiceDate >= previousYearStart && invoiceDate <= previousYearEnd;
      });
    } else if (incomeTimePeriod === "Last 12 Months") {
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      nextInvoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.date || invoice.createdAt);
        return invoiceDate >= twelveMonthsAgo && invoiceDate <= now;
      });
    } else if (incomeTimePeriod === "Last 6 Months") {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      nextInvoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.date || invoice.createdAt);
        return invoiceDate >= sixMonthsAgo && invoiceDate <= now;
      });
    }

    if (accountingBasis === "Cash") {
      nextInvoices = nextInvoices.filter((invoice) => {
        const paidAmount = payments
          .filter((payment) => payment.invoiceId === invoice.id || payment.invoiceId === invoice._id || payment.invoiceNumber === invoice.invoiceNumber)
          .reduce((sum, payment) => sum + parseFloat(String(payment.amountReceived || payment.amount || 0)), 0);
        const invoiceTotal = parseFloat(String(invoice.total || invoice.amount || 0));
        return paidAmount >= invoiceTotal;
      });
    }

    return nextInvoices;
  })();

  const totalIncome = filteredInvoices.reduce((sum, invoice) => {
    const amount = parseFloat(String(invoice.total || invoice.amount || invoice.subtotal || 0));
    return sum + amount;
  }, 0);

  const chartData = (() => {
    const periods: { label: string; year: number; month: number; total: number }[] = [];
    const now = new Date();

    if (incomeTimePeriod === "Last 6 Months" || incomeTimePeriod === "Last 12 Months") {
      const count = incomeTimePeriod === "Last 6 Months" ? 6 : 12;
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        periods.push({
          label: date.toLocaleString("en-US", { month: "short" }),
          year: date.getFullYear(),
          month: date.getMonth(),
          total: 0,
        });
      }
    } else if (incomeTimePeriod === "This Fiscal Year") {
      const startMonth = 6;
      const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
      for (let index = 0; index < 12; index += 1) {
        const date = new Date(fiscalYearStart, startMonth + index, 1);
        if (date > now) break;
        periods.push({
          label: date.toLocaleString("en-US", { month: "short" }),
          year: date.getFullYear(),
          month: date.getMonth(),
          total: 0,
        });
      }
    } else if (incomeTimePeriod === "Previous Fiscal Year") {
      const startMonth = 6;
      const fiscalYearStart = now.getMonth() >= startMonth ? now.getFullYear() - 1 : now.getFullYear() - 2;
      for (let index = 0; index < 12; index += 1) {
        const date = new Date(fiscalYearStart, startMonth + index, 1);
        periods.push({
          label: date.toLocaleString("en-US", { month: "short" }),
          year: date.getFullYear(),
          month: date.getMonth(),
          total: 0,
        });
      }
    }

    filteredInvoices.forEach((invoice) => {
      const invoiceDate = new Date(String(invoice.invoiceDate || invoice.date || invoice.createdAt || 0));
      const period = periods.find((item) => item.year === invoiceDate.getFullYear() && item.month === invoiceDate.getMonth());
      if (period) {
        period.total += parseFloat(String(invoice.total || invoice.amount || 0));
      }
    });

    return periods;
  })();

  const maxChartValue = Math.max(...chartData.map((item) => item.total), 1000);
  const hasIncomeData = chartData.some((item) => item.total > 0);
  const chartHeight = 160;
  const chartWidth = 400;

  return (
    <div className="flex-1 min-w-0 bg-white p-4">
      <div className="mb-4 grid grid-cols-2 gap-10">
        <div>
          <div className="px-2">
            <span className="text-sm text-gray-500">Payment due period</span>
          </div>
          <div className="px-2 pt-1">
            <div className="text-sm text-gray-900">
              {customer.paymentTerms === "due-on-receipt" ? "Due on Receipt" : customer.paymentTerms || "Due on Receipt"}
            </div>
          </div>
        </div>
        <div>
          <div className="px-2">
            <span className="text-sm text-gray-500">Credit Limit</span>
          </div>
          <div className="px-2 pt-1">
            <div className="text-sm text-gray-900">{getCreditLimitText(customer, formatCurrency)}</div>
          </div>
        </div>
      </div>

      <div className="mb-4 border-y border-gray-200 bg-white">
        <div className="px-2 py-3">
          <span className="text-lg font-medium text-gray-900">Receivables</span>
        </div>
        <div className="overflow-hidden border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">CURRENCY</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">OUTSTANDING RECEIVABLES</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">UNUSED CREDITS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {`${customer.currency || "USD"}- ${
                    availableCurrencies.find((currency) => currency?.code === (customer.currency || "USD"))?.currencyName ||
                    availableCurrencies.find((currency) => currency?.code === (customer.currency || "USD"))?.name ||
                    "Armenian Dram"
                  }`}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(customer.receivables || 0, customer.currency || "USD")}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(customer.unusedCredits || 0, customer.currency || "USD")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showCreditLimitWarning && (
        <div className="mb-4 flex items-center gap-2 bg-white px-4 py-3 text-sm text-orange-600">
          <AlertTriangle size={16} className="text-orange-500" />
          <span>Credit limit is being exceeded by {formatCurrency(receivablesValue - creditLimitValue, customer.currency || "USD")}</span>
        </div>
      )}

      {customer.linkedVendorId && (
        <div className="mb-4 border-y border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payables</span>
          </div>
          <div className="overflow-hidden border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">CURRENCY</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">OUTSTANDING PAYABLES</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">UNUSED CREDITS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">{customer.currency || "USD"}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(linkedVendor?.payables || 0, customer.currency || "USD")}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(linkedVendor?.unusedCredits || 0, customer.currency || "USD")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 p-4 pt-2">
            <div className="text-xs text-gray-500">
              Linked Vendor: <span className="font-medium text-gray-900">{customer.linkedVendorName || linkedVendor?.name || "N/A"}</span>
            </div>
          </div>
        </div>
      )}

      {customerSubscriptions.length === 0 ? (
        <div className="mb-4 rounded border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
          <div className="mb-4 text-sm text-gray-500">No subscriptions have been created for this customer yet.</div>
          <div className="relative inline-flex" ref={subscriptionDropdownRef}>
            <div className="flex items-center">
              <button
                className="flex h-[38px] min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-l-lg border-b-[4px] border-[#0D4A52] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                onClick={() => navigate("/sales/subscriptions/new", { state: { customerId, customerName } })}
              >
                <Plus size={16} /> New
              </button>
              <button
                className="flex h-[38px] w-10 cursor-pointer items-center justify-center rounded-r-lg border-b-[4px] border-l border-[#0B3A41] border-white/20 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                style={{ background: "#0D4A52" }}
                onClick={() => setIsSubscriptionDropdownOpen((previous) => !previous)}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {isSubscriptionDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded border border-gray-200 bg-white text-left shadow-lg">
                <div
                  className="cursor-pointer px-4 py-2 text-sm text-white transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onClick={() => {
                    setIsSubscriptionDropdownOpen(false);
                    navigate("/sales/subscriptions/new", { state: { customerId, customerName } });
                  }}
                >
                  New Subscription
                </div>
                <div
                  className="cursor-pointer px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => {
                    setIsSubscriptionDropdownOpen(false);
                    navigate("/sales/quotes/subscription/new", { state: { customerId, customerName, forSubscription: true } });
                  }}
                >
                  Create Quote for Subscription
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 border-y border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">SUBSCRIPTIONS</span>
            <div className="relative inline-flex" ref={subscriptionDropdownRef}>
              <div className="flex items-center">
                <button
                  className="flex h-[38px] min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-l-lg border-b-[4px] border-[#0D4A52] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                  style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={() => navigate("/sales/subscriptions/new", { state: { customerId, customerName } })}
                >
                  <Plus size={16} /> New
                </button>
                <button
                  className="flex h-[38px] w-10 cursor-pointer items-center justify-center rounded-r-lg border-b-[4px] border-l border-[#0B3A41] border-white/20 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                  style={{ background: "#0D4A52" }}
                  onClick={() => setIsSubscriptionDropdownOpen((previous) => !previous)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {isSubscriptionDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded border border-gray-200 bg-white text-left shadow-lg">
                  <div
                    className="cursor-pointer px-4 py-2 text-sm text-white transition-colors"
                    style={{ backgroundColor: "#156372" }}
                    onClick={() => {
                      setIsSubscriptionDropdownOpen(false);
                      navigate("/sales/subscriptions/new", { state: { customerId, customerName } });
                    }}
                  >
                    New Subscription
                  </div>
                  <div
                    className="cursor-pointer px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => {
                      setIsSubscriptionDropdownOpen(false);
                      navigate("/sales/quotes/subscription/new", { state: { customerId, customerName, forSubscription: true } });
                    }}
                  >
                    Create Quote for Subscription
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {customerSubscriptions.map((subscription: any) => {
              const normalizeText = (value: any) => String(value ?? "").trim();
              const pick = (...values: any[]) => values.find((value) => normalizeText(value));

              const name = normalizeText(
                pick(
                  subscription?.planName,
                  subscription?.plan_name,
                  subscription?.plan?.name,
                  subscription?.plan?.planName,
                  subscription?.productName,
                  subscription?.product?.name,
                  subscription?.subscriptionName,
                  subscription?.subscription_name,
                  subscription?.items?.[0]?.itemDetails,
                  subscription?.items?.[0]?.name,
                  subscription?.items?.[0]?.label,
                  subscription?.addonLines?.[0]?.addonName,
                  subscription?.addonLines?.[0]?.name,
                  subscription?.addons?.[0]?.name,
                  subscription?.name,
                  "Subscription",
                ),
              );
              const description = normalizeText(
                pick(
                  subscription?.planDescription,
                  subscription?.plan_description,
                  subscription?.plan?.description,
                  subscription?.description,
                  subscription?.notes,
                  subscription?.summary,
                  "",
                ),
              );
              const subscriptionId = subscription?.subscriptionId || subscription?.referenceId || subscription?.id || subscription?._id || "";
              const subscriptionNumber = subscription?.subscriptionNumber || subscription?.number || subscription?.code || "";
              const amountRaw = subscription?.amount ?? subscription?.total ?? subscription?.amountDue ?? 0;
              let currency = String(subscription?.currency || customer?.currency || "USD");
              let amountValue = 0;

              if (typeof amountRaw === "string") {
                const currencyMatch = amountRaw.match(/^[A-Za-z]+/);
                if (currencyMatch?.[0]) currency = currencyMatch[0];
                amountValue = Number(amountRaw.replace(/[^\d.]/g, "")) || 0;
              } else {
                amountValue = Number(amountRaw) || 0;
              }

              const statusRaw = String(subscription?.status || subscription?.state || "LIVE").toUpperCase();
              const lastBilling = subscription?.lastBilledOn || subscription?.lastBillingDate || subscription?.lastBilledDate || subscription?.lastBillingOn;
              const nextBilling = subscription?.nextBillingOn || subscription?.nextBillingDate || subscription?.nextBillDate;
              const statusDotClass = statusRaw.includes("UNPAID") || statusRaw.includes("OVERDUE") || statusRaw.includes("DUE")
                ? "bg-red-500"
                : statusRaw.includes("LIVE") || statusRaw.includes("ACTIVE")
                  ? "bg-green-500"
                  : "bg-gray-400";
              const statusTextClass = statusDotClass === "bg-red-500" ? "text-red-600" : statusDotClass === "bg-green-500" ? "text-green-600" : "text-gray-600";

              return (
                <div key={String(subscriptionId || subscriptionNumber || name)} className="px-4 py-6">
                  <div className="flex items-start justify-between gap-8">
                    <div className="min-w-0">
                      <div className="text-base font-medium text-blue-600">
                        <span>{name}</span>
                        {description && <span className="ml-1 text-xs font-normal text-gray-500">({description})</span>}
                      </div>
                      <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                        {subscriptionId && <div>Subscription ID : {subscriptionId}</div>}
                        {subscriptionNumber && <div>Subscription# : {subscriptionNumber}</div>}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="text-xl font-semibold text-gray-900">{formatCurrency(amountValue || 0, currency)}</div>
                      <div className={`mt-0.5 inline-flex items-center justify-end gap-2 text-[11px] font-semibold ${statusTextClass}`}>
                        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
                        <span>{statusRaw}</span>
                      </div>
                    </div>
                  </div>

                  {(lastBilling || nextBilling) && (
                    <div className="mt-5 text-sm text-gray-600">
                      {lastBilling && <span>Last Billing Date : {formatDateForDisplay(lastBilling)}</span>}
                      {nextBilling && <span className={lastBilling ? "ml-4" : ""}>Next Billing Date : {formatDateForDisplay(nextBilling)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 border-y border-gray-200 bg-white">
        <div className="flex items-start justify-between px-2 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-gray-900">Income and Expense</span>
            <span className="text-xs text-gray-500">This chart is displayed in the organization's base currency.</span>
          </div>
          <div className="relative" ref={incomeTimePeriodRef}>
            <button
              onClick={() => setIsIncomeTimePeriodDropdownOpen((previous) => !previous)}
              className="cursor-pointer border-none bg-transparent text-sm text-blue-600 hover:text-blue-700"
            >
              <span className="flex items-center gap-1">
                {incomeTimePeriod}
                <ChevronDown size={14} className={`transition-transform duration-200 ${isIncomeTimePeriodDropdownOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            {isIncomeTimePeriodDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-[200px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {["This Fiscal Year", "Previous Fiscal Year", "Last 12 Months", "Last 6 Months"].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setIncomeTimePeriod(period);
                      setIsIncomeTimePeriodDropdownOpen(false);
                    }}
                    className={`w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors ${incomeTimePeriod === period ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pb-4">
          <div className="relative mb-4 h-56 overflow-hidden rounded-md p-4">
            <div className="relative h-full w-full">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-0 w-full border-t border-gray-200"></div>
                ))}
              </div>
              {hasIncomeData && (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full overflow-visible">
                  <path
                    d={`M 0 ${chartHeight} ${chartData
                      .map((item, index) => `L ${(index / (chartData.length - 1)) * chartWidth} ${chartHeight - (item.total / maxChartValue) * chartHeight * 0.8}`)
                      .join(" ")} L ${chartWidth} ${chartHeight} Z`}
                    fill="rgba(59, 130, 246, 0.10)"
                  />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData
                      .map((item, index) => `${(index / (chartData.length - 1)) * chartWidth},${chartHeight - (item.total / maxChartValue) * chartHeight * 0.8}`)
                      .join(" ")}
                  />
                </svg>
              )}
              <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between px-1">
                {chartData.map((item, index) => (
                  <span key={index} className="text-[10px] font-medium text-gray-400">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 text-lg font-medium text-gray-900">
            Total Income ({incomeTimePeriod}) - {formatCurrency(totalIncome, customer.currency?.substring(0, 3) || "USD")}
          </div>
        </div>
      </div>

      <CustomerDetailOverviewActivity
        customer={customer}
        id={id}
        invoices={invoices}
        payments={payments}
        creditNotes={creditNotes}
        quotes={quotes}
        salesReceipts={salesReceipts}
        recurringInvoices={recurringInvoices}
        customerSubscriptions={customerSubscriptions}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
