export type MetricLegendItem = {
  label: string;
  value: string;
  color: string;
};

export type DashboardSummary = {
  metrics: {
    netRevenue: { total: number; labels: string[]; values: number[] };
    receivables: {
      total: number;
      current: number;
      overdue: number;
      currentCount: number;
      overdueCount: number;
      labels: string[];
      values: number[];
    };
    mrr: { total: number; labels: string[]; values: number[] };
    activeSubscriptions: { total: number; labels: string[]; values: number[] };
    churnRate: { total: number; asOf: string; labels: string[]; values: number[] };
    arpu: { total: number; labels: string[]; values: number[] };
    ltv: { total: number; asOf: string; labels: string[]; values: number[] };
  };
  subscriptionSummary: {
    signups: number;
    activations: number;
    cancellations: number;
    reactivations: number;
    series: {
      labels: string[];
      signups: number[];
      activations: number[];
      cancellations: number[];
      reactivations: number[];
    };
  };
  incomeExpense: {
    totalIncome: number;
    totalReceipts: number;
    totalExpenses: number;
    labels: string[];
    income: number[];
    receipts: number[];
    expenses: number[];
  };
  topExpenses: {
    total: number;
    items: MetricLegendItem[];
  };
  projects: {
    totalCount: number;
    totalUnbilledMinutes: number;
    totalUnbilledHours: string;
    totalUnbilledExpenses: number;
    topProject: null | {
      id: string;
      name: string;
      customerName: string;
      unbilledHours: string;
      unbilledExpenses: number;
      progress: number;
      budgetLabel: string;
    };
  };
  organization: {
    name: string;
    baseCurrency: string;
  };
};

export const EMPTY_SUMMARY: DashboardSummary = {
  metrics: {
    netRevenue: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    receivables: {
      total: 0,
      current: 0,
      overdue: 0,
      currentCount: 0,
      overdueCount: 0,
      labels: ["Current", "1-15", "15-30", "31-45", ">45"],
      values: [0, 0, 0, 0, 0],
    },
    mrr: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    activeSubscriptions: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    churnRate: { total: 0, asOf: "", labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    arpu: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    ltv: { total: 0, asOf: "", labels: ["", "", "", ""], values: [0, 0, 0, 0] },
  },
  subscriptionSummary: {
    signups: 0,
    activations: 0,
    cancellations: 0,
    reactivations: 0,
    series: {
      labels: ["", "", "", ""],
      signups: [0, 0, 0, 0],
      activations: [0, 0, 0, 0],
      cancellations: [0, 0, 0, 0],
      reactivations: [0, 0, 0, 0],
    },
  },
  incomeExpense: {
    totalIncome: 0,
    totalReceipts: 0,
    totalExpenses: 0,
    labels: ["", "", "", ""],
    income: [0, 0, 0, 0],
    receipts: [0, 0, 0, 0],
    expenses: [0, 0, 0, 0],
  },
  topExpenses: {
    total: 0,
    items: [],
  },
  projects: {
    totalCount: 0,
    totalUnbilledMinutes: 0,
    totalUnbilledHours: "00:00",
    totalUnbilledExpenses: 0,
    topProject: null,
  },
  organization: {
    name: "",
    baseCurrency: "",
  },
};

export const formatCurrencyValue = (value: number, currencyCode = "") =>
  `${currencyCode}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  )}`;
