import React, { useCallback, useEffect } from "react";
import { formatCurrency, formatMailDateTime, type Mail } from "./CustomerDetail.shared";

export function useCustomerDetailMailLog(detail: any) {
    const {
        activeTab,
        customer,
        id,
        invoices,
        payments,
        setMails,
    } = detail as any;

    const buildCustomerSystemMails = useCallback((customerRow: any) => {
        const customerId = String(id || customerRow?._id || customerRow?.id || "").trim();
        if (!customerId) return [];

        const emails = Array.from(new Set([
            String(customerRow?.email || "").trim(),
            ...(Array.isArray(customerRow?.contactPersons)
                ? customerRow.contactPersons.map((p: any) => String(p?.email || "").trim())
                : []),
        ].filter(Boolean))).filter(Boolean);

        const defaultTo = emails[0] || "";

        const rows: Array<Mail & { sortTime: number }> = [];

        // 1) Local mail log (created via customersAPI.sendInvitation/sendReviewRequest/sendStatement)
        try {
            const raw = localStorage.getItem("taban_customer_mail_log");
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            list
                .filter((entry: any) => String(entry?.customerId || "").trim() === customerId)
                .forEach((entry: any, idx: number) => {
                    const type = String(entry?.type || "system").trim();
                    const payload = entry?.payload || {};
                    const createdAt = entry?.createdAt || entry?.timestamp || entry?.date || "";
                    const to =
                        String(payload?.to || payload?.email || payload?.recipient || defaultTo || "").trim() ||
                        defaultTo ||
                        "";

                    const subjectAndDesc = (() => {
                        if (type === "send-invitation") {
                            return { subject: "Invite to Portal", description: "Sent" };
                        }
                        if (type === "request-review") {
                            return { subject: "Request Review", description: "Sent" };
                        }
                        if (type === "send-statement") {
                            return { subject: "Customer Statement", description: "Sent" };
                        }
                        return { subject: type.replace(/-/g, " "), description: "Sent" };
                    })();

                    rows.push({
                        id: String(entry?.id || `mail-log-${idx}`),
                        to,
                        subject: subjectAndDesc.subject,
                        description: subjectAndDesc.description,
                        date: formatMailDateTime(createdAt),
                        type,
                        initial: (to?.[0] || "M").toUpperCase(),
                        sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - idx,
                    });
                });
        } catch {
            // ignore local storage errors
        }

        // 2) Payments → Payment Acknowledgment
        const paymentTo = defaultTo;
        if (paymentTo && Array.isArray(payments) && payments.length) {
            payments.forEach((payment: any, idx: number) => {
                const createdAt = payment?.date || payment?.paymentDate || payment?.createdAt || payment?.created_on || "";
                const amount = Number(payment?.amount ?? payment?.total ?? payment?.amountPaid ?? 0) || 0;
                const currency = String(payment?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(payment?.id || payment?._id || `payment-mail-${idx}`),
                    to: paymentTo,
                    subject: "Payment Acknowledgment - Thank you, We have received your payment.",
                    description: amount ? `${formatCurrency(amount, currency)} - Sent` : "Sent",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "payment",
                    initial: (paymentTo?.[0] || "P").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 1000 - idx,
                });
            });
        }

        // 3) Unpaid/Overdue invoices → Payment Reminder
        const reminderTo = defaultTo;
        if (reminderTo && Array.isArray(invoices) && invoices.length) {
            invoices.forEach((inv: any, idx: number) => {
                const status = String(inv?.status || inv?.invoiceStatus || "").toLowerCase();
                if (!status.includes("overdue") && !status.includes("unpaid") && !status.includes("due")) return;
                const number = String(inv?.invoiceNumber || inv?.invoiceNo || inv?.invoice_number || inv?.number || "INV").trim();
                const createdAt = inv?.date || inv?.invoiceDate || inv?.createdAt || inv?.created_on || "";
                const total = Number(inv?.total ?? inv?.amount ?? inv?.balance ?? 0) || 0;
                const currency = String(inv?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(inv?.id || inv?._id || `invoice-reminder-${idx}`),
                    to: reminderTo,
                    subject: `Payment Reminder - Payment of ${formatCurrency(total, currency)} is outstanding for ${number}`,
                    description: "",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "reminder",
                    initial: (reminderTo?.[0] || "R").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 2000 - idx,
                });
            });
        }

        // Sort newest first and limit (keep UI fast)
        return rows
            .filter((m) => Boolean(String(m.to || "").trim()))
            .sort((a, b) => b.sortTime - a.sortTime)
            .slice(0, 50)
            .map(({ sortTime, ...mail }) => mail);
    }, [id, payments, invoices]);

    useEffect(() => {
        if (!customer || !id) return;
        // keep mails always in sync with selected customer + latest local logs
        setMails(buildCustomerSystemMails(customer));
    }, [customer, id, buildCustomerSystemMails, activeTab]);

    Object.assign(detail, {
        buildCustomerSystemMails,
    });

    return detail;
}
