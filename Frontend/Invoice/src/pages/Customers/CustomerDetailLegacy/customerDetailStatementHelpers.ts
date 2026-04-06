import type { Transaction } from "../CustomerDetail/CustomerDetail.shared";

type BuildStatementTransactionsInput = {
    customer: any;
    invoices?: any[];
    payments?: any[];
    creditNotes?: any[];
    today?: Date;
};

const toNumber = (value: unknown) => {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
};

export function buildStatementDateRange(statementPeriod: string, now = new Date()) {
    let startDate: Date;
    let endDate: Date;

    switch (statementPeriod) {
        case "this-month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case "last-month":
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case "this-quarter": {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        }
        case "this-year":
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
}

export function buildStatementTransactions({
    customer,
    invoices = [],
    payments = [],
    creditNotes = [],
    today = new Date(),
}: BuildStatementTransactionsInput): Transaction[] {
    if (!customer) {
        return [];
    }

    const transactions: Transaction[] = [];
    const openingBalance = toNumber(customer.openingBalance);

    transactions.push({
        id: "opening",
        date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
        type: "Opening Balance",
        details: "***Opening Balance***",
        amount: openingBalance,
        payments: 0,
        balance: openingBalance,
    });

    payments.forEach((payment) => {
        const amount = toNumber(payment.amountReceived || payment.amount);
        transactions.push({
            id: `payment-${payment.id}`,
            date: payment.paymentDate || payment.date || new Date().toISOString(),
            type: "Payment Received",
            details: `${payment.paymentNumber || payment.id}\nAMD${amount.toLocaleString()} in excess payments`,
            detailsLink: payment.paymentNumber || payment.id,
            amount: 0,
            payments: amount,
            balance: 0,
        });
    });

    creditNotes.forEach((creditNote) => {
        const amount = toNumber(creditNote.total || creditNote.amount);
        transactions.push({
            id: `cn-${creditNote.id}`,
            date: creditNote.date || creditNote.creditNoteDate || new Date().toISOString(),
            type: "Credit Note",
            details: creditNote.creditNoteNumber || creditNote.id,
            detailsLink: creditNote.creditNoteNumber || creditNote.id,
            amount: -amount,
            payments: 0,
            balance: 0,
        });
    });

    invoices.forEach((invoice) => {
        const amount = toNumber(invoice.total || invoice.amount);
        transactions.push({
            id: `inv-${invoice.id}`,
            date: invoice.date || invoice.invoiceDate || new Date().toISOString(),
            type: "Invoice",
            details: invoice.invoiceNumber || invoice.id,
            detailsLink: invoice.invoiceNumber || invoice.id,
            amount,
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

    return transactions;
}
