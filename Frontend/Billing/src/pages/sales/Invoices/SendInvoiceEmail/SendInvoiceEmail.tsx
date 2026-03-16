import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  FileText,
  HelpCircle
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getInvoiceById, getInvoices } from "../../salesModel";
import { invoicesAPI } from "../../../../services/api";
import { applyEmailTemplate } from "../../../settings/emailTemplateUtils";

const normalizeInvoiceItems = (sourceInvoice: any) => {
  const coerceItems = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      if (Array.isArray((value as any).data)) return (value as any).data;
      if (Array.isArray((value as any).items)) return (value as any).items;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          if (Array.isArray((parsed as any).data)) return (parsed as any).data;
          if (Array.isArray((parsed as any).items)) return (parsed as any).items;
          return Object.values(parsed);
        }
      } catch {
        return [];
      }
      return [];
    }
    if (typeof value === "object") return Object.values(value);
    return [];
  };

  const rawItems = [
    ...coerceItems(sourceInvoice?.items),
    ...coerceItems(sourceInvoice?.lineItems),
    ...coerceItems(sourceInvoice?.line_items),
    ...coerceItems(sourceInvoice?.itemDetails),
    ...coerceItems(sourceInvoice?.projectDetails),
    ...coerceItems(sourceInvoice?.invoiceItems),
    ...coerceItems(sourceInvoice?.itemsList)
  ];

  return rawItems.map((item: any) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? item?.q ?? 0) || 0;
    const rate = Number(item?.unitPrice ?? item?.rate ?? item?.price ?? item?.unit_price ?? item?.unitRate ?? 0) || 0;
    const amountRaw = item?.amount ?? item?.total ?? item?.lineTotal ?? item?.line_total;
    const amount = Number(amountRaw ?? quantity * rate) || 0;
    const unit = String(item?.unit ?? item?.unitName ?? item?.uom ?? "pcs");
    const projectName =
      item?.projectName ||
      (typeof item?.project === "object" ? item?.project?.name || item?.project?.projectName : "") ||
      "";
    const displayName = String(
      item?.itemDetails ||
      item?.name ||
      item?.description ||
      item?.item?.name ||
      item?.itemName ||
      projectName ||
      "Item"
    );

    return {
      ...item,
      displayName,
      displayQuantity: quantity,
      displayRate: rate,
      displayAmount: amount,
      displayUnit: unit,
      projectName
    };
  });
};

export default function SendInvoiceEmail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingStage, setSendingStage] = useState("");
  const [senderName, setSenderName] = useState("JIRDE HUSSEIN KHALIF");
  const [emailData, setEmailData] = useState({
    from: "\"JIRDE HUSSEIN KHALIF\" <jirdehusseinkhalif@gmail.com>",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachInvoicePDF, setAttachInvoicePDF] = useState(true);
  const [attachCustomerStatement, setAttachCustomerStatement] = useState(false);
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const fileInputRef = useRef(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const [isBodyDirty, setIsBodyDirty] = useState(false);
  const containsHtmlMarkup = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value || "");
  const readLocalJson = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const getLocalPrimarySender = () => {
    const senderKeys = [
      "taban_books_sender_emails",
      "taban_sender_emails",
      "sender_emails",
      "taban_books_settings_sender_emails",
    ];
    for (const key of senderKeys) {
      const parsed = readLocalJson(key);
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];
      if (!rows.length) continue;
      const primary = rows.find((row: any) => row?.isPrimary) || rows[0];
      const name = String(primary?.name || "").trim();
      const email = String(primary?.email || "").trim();
      if (name || email) {
        return { name, email };
      }
    }

    const orgProfile = readLocalJson("organization_profile") || readLocalJson("org_profile") || {};
    const user = readLocalJson("user") || {};
    return {
      name: String(orgProfile?.organizationName || user?.name || "").trim(),
      email: String(orgProfile?.email || user?.email || "").trim(),
    };
  };
  const getLocalEmailTemplateByKey = (templateKey: string) => {
    const templateKeys = [
      "taban_books_email_templates",
      "taban_email_templates",
      "email_templates",
      "taban_books_settings_email_templates",
    ];
    const normalizedKey = String(templateKey || "").toLowerCase().trim();
    for (const key of templateKeys) {
      const parsed = readLocalJson(key);
      if (!parsed) continue;

      if (Array.isArray(parsed)) {
        const found = parsed.find((row: any) =>
          [row?.key, row?.templateKey, row?.name, row?.id]
            .map((value) => String(value || "").toLowerCase().trim())
            .includes(normalizedKey)
        );
        if (found) return found;
      } else if (typeof parsed === "object") {
        if (parsed[templateKey]) return parsed[templateKey];
        const foundEntry = Object.entries(parsed).find(([entryKey]) => String(entryKey || "").toLowerCase().trim() === normalizedKey);
        if (foundEntry) return foundEntry[1];
      }
    }
    return null;
  };
  const getLocalAttachPdfSetting = () => {
    const general = readLocalJson("taban_books_settings_general");
    const raw = general?.pdfSettings?.attachPDFInvoice
      ?? general?.settings?.pdfSettings?.attachPDFInvoice;
    return raw === undefined ? true : Boolean(raw);
  };

  const getCustomerDisplayName = (invoiceData: any) => {
    if (!invoiceData) return "Customer";
    if (typeof invoiceData.customerName === "string" && invoiceData.customerName.trim()) {
      return invoiceData.customerName.trim();
    }

    const customer = invoiceData.customer;
    if (typeof customer === "string" && customer.trim()) {
      return customer.trim();
    }

    if (customer && typeof customer === "object") {
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
      return (
        customer.displayName ||
        customer.companyName ||
        customer.fullName ||
        fullName ||
        customer.name ||
        customer.email ||
        "Customer"
      );
    }

    return "Customer";
  };

  const getCustomerEmail = (invoiceData: any) => {
    if (!invoiceData) return "";
    if (typeof invoiceData.customerEmail === "string" && invoiceData.customerEmail.trim()) {
      return invoiceData.customerEmail.trim();
    }
    const customer = invoiceData.customer;
    if (customer && typeof customer === "object" && typeof customer.email === "string") {
      return customer.email.trim();
    }
    return "";
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      if (id) {
        try {
          const invoiceData = await getInvoiceById(id);
          if (invoiceData) {
            setInvoice(invoiceData);
            const customerDisplayName = getCustomerDisplayName(invoiceData);
            const customerEmail = getCustomerEmail(invoiceData);

            // Fetch primary sender
            let sName = import.meta.env.VITE_EMAIL_SENDER_NAME || "JIRDE HUSSEIN KHALIF";
            let sEmail = import.meta.env.VITE_EMAIL_FROM || "jirdehusseinkhalif@gmail.com";

            const localPrimary = getLocalPrimarySender();
            sName = localPrimary.name || sName;
            sEmail = localPrimary.email || sEmail;

            setSenderName(sName);

            const iNumber = invoiceData.invoiceNumber || invoiceData.id;
            const iDate = formatDate(invoiceData.invoiceDate || invoiceData.date);
            const rawBalance = Number(invoiceData?.balance ?? invoiceData?.balanceDue);
            const paidAmount = Number(invoiceData?.amountPaid ?? 0);
            const totalAmount = Number(invoiceData?.total ?? invoiceData?.amount ?? 0);
            const balanceDueAmount = Number.isFinite(rawBalance) ? rawBalance : Math.max(0, totalAmount - paidAmount);
            const isDebitNote = !!invoiceData.debitNote;
            const docLabel = isDebitNote ? "Debit Note" : "Invoice";
            const iBalance = formatCurrency(balanceDueAmount, invoiceData.currency);
            const defaultBody = buildInvoiceEmailHtml(invoiceData, customerDisplayName, sName);
            let templateSubject = `${docLabel} - ${iNumber} from Taban Enterprise`;
            let templateBody = defaultBody;

            const template = getLocalEmailTemplateByKey("invoice_notification");
            if (template) {
              templateSubject = applyEmailTemplate(template.subject || templateSubject, {
                InvoiceNumber: iNumber,
                CompanyName: "Taban Enterprise",
                CustomerName: customerDisplayName,
                InvoiceDate: iDate,
                Amount: iBalance,
                BalanceDue: iBalance,
                SenderName: sName,
              });
              const templateBodySource = String(template.emailBody || template.body || "").trim();
              if (templateBodySource && containsHtmlMarkup(templateBodySource)) {
                templateBody = applyEmailTemplate(templateBodySource, {
                  InvoiceNumber: iNumber,
                  CompanyName: "Taban Enterprise",
                  CustomerName: customerDisplayName,
                  InvoiceDate: iDate,
                  Amount: iBalance,
                  BalanceDue: iBalance,
                  SenderName: sName,
                });
              }
            }

            setEmailData({
              from: `"${sName}" <${sEmail}>`,
              sendTo: customerEmail,
              cc: "",
              bcc: "",
              subject: templateSubject,
              body: templateBody,
            });
            setIsBodyDirty(false);

            setAttachInvoicePDF(getLocalAttachPdfSetting());
          } else {
            navigate("/sales/invoices");
          }
        } catch (error) {
          console.error("Error fetching invoice:", error);
          navigate("/sales/invoices");
        }
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  useEffect(() => {
    if (!bodyEditorRef.current || isBodyDirty) return;
    if (emailData.body) {
      bodyEditorRef.current.innerHTML = emailData.body;
    }
  }, [emailData.body, isBodyDirty]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount, currency = "AMD") => {
    return `${currency}${parseFloat(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const buildInvoiceEmailHtml = (invoiceData: any, customerName: string, fromName: string) => {
    const invoiceNumber = String(invoiceData?.invoiceNumber || invoiceData?.id || "-");
    const invoiceDate = formatDate(invoiceData?.invoiceDate || invoiceData?.date);
    const dueDate = invoiceData?.dueDate ? formatDate(invoiceData.dueDate) : "";
    const rawBalance = Number(invoiceData?.balance ?? invoiceData?.balanceDue);
    const paidAmount = Number(invoiceData?.amountPaid ?? 0);
    const totalAmount = Number(invoiceData?.total ?? invoiceData?.amount ?? 0);
    const balanceDueAmount = Number.isFinite(rawBalance) ? rawBalance : Math.max(0, totalAmount - paidAmount);
    const amount = formatCurrency(balanceDueAmount, invoiceData?.currency);
    const viewUrl = `${window.location.origin}/portal/invoices/${invoiceData?.id || invoiceData?._id || ""}`;

    const isDebitNote = !!invoiceData.debitNote;
    const docLabel = isDebitNote ? "Debit Note" : "Invoice";

    return `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto;">
  <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 500;">${docLabel} #${escapeHtml(invoiceNumber)}</h1>
  </div>

  <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 4px 4px;">
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>Thank you for your business. Your ${docLabel.toLowerCase()} can be viewed, printed and downloaded as PDF from the link below.</p>

    <div style="background-color: #fefce8; border: 1px solid #fef9c3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 4px;">
      <div style="font-size: 30px; color: #111827; font-weight: 700; margin-bottom: 6px;">BALANCE DUE</div>
      <div style="font-size: 26px; color: #ef4444; font-weight: bold; margin-bottom: 15px;">${escapeHtml(amount)}</div>

      <div style="text-align: left; max-width: 280px; margin: 0 auto; border-top: 1px solid #e5e7eb; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-size: 12px; color: #6b7280;">${docLabel} No</span>
          <span style="font-size: 12px; font-weight: bold;">${escapeHtml(invoiceNumber)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-size: 12px; color: #6b7280;">${docLabel} Date</span>
          <span style="font-size: 12px; font-weight: bold;">${escapeHtml(invoiceDate)}</span>
        </div>
        ${dueDate ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 12px; color: #6b7280;">Due Date</span>
          <span style="font-size: 12px; font-weight: bold;">${escapeHtml(dueDate)}</span>
        </div>` : ""}
      </div>

      <div style="margin-top: 20px;">
        <a href="${escapeHtml(viewUrl)}" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">VIEW ${docLabel.toUpperCase()}</a>
      </div>
    </div>

    <div style="margin-top: 30px; padding-top: 20px;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Regards,</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 14px;">${escapeHtml(fromName)}</p>
    </div>
  </div>
</div>`;
  };

  const toNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const getInvoiceDisplayTotal = (invoiceData: any) => {
    if (invoiceData?.total !== undefined && invoiceData?.total !== null) {
      return toNumber(invoiceData.total);
    }
    if (invoiceData?.amount !== undefined && invoiceData?.amount !== null) {
      return toNumber(invoiceData.amount);
    }
    const subTotal = toNumber(invoiceData?.subTotal ?? invoiceData?.subtotal);
    const tax = toNumber(invoiceData?.taxAmount ?? invoiceData?.tax);
    const discount = toNumber(invoiceData?.discountAmount ?? invoiceData?.discount);
    const shipping = toNumber(invoiceData?.shippingCharges ?? invoiceData?.shipping);
    const adjustment = toNumber(invoiceData?.adjustment);
    const roundOff = toNumber(invoiceData?.roundOff);
    return subTotal + tax - discount + shipping + adjustment + roundOff;
  };

  const getInvoiceTotalsMeta = (invoiceData: any) => {
    const items = Array.isArray(invoiceData?.items) ? invoiceData.items : [];
    const computedSubTotalFromItems = items.reduce((sum: number, item: any) => {
      if (!item || item.itemType === "header") return sum;
      const qty = toNumber(item.quantity);
      const rate = toNumber(item.rate ?? item.unitPrice ?? item.price);
      const lineAmount = toNumber(item.amount ?? item.total);
      return sum + (lineAmount || qty * rate);
    }, 0);

    const subTotal = toNumber(invoiceData?.subTotal ?? invoiceData?.subtotal ?? computedSubTotalFromItems);
    let taxAmount = toNumber(invoiceData?.taxAmount ?? invoiceData?.tax);
    if (!taxAmount && items.length > 0) {
      taxAmount = items.reduce((sum: number, item: any) => {
        if (!item || item.itemType === "header") return sum;
        const qty = toNumber(item.quantity);
        const rate = toNumber(item.rate ?? item.unitPrice ?? item.price);
        const lineAmount = toNumber(item.amount ?? item.total ?? qty * rate);
        const explicitTax = toNumber(item.taxAmount);
        if (explicitTax) return sum + explicitTax;
        const itemTaxRate = toNumber(item.taxRate ?? item.taxPercentage ?? item.salesTaxRate ?? item.tax);
        return sum + (itemTaxRate > 0 ? (lineAmount * itemTaxRate) / 100 : 0);
      }, 0);
    }

    const taxModeLabel = String(invoiceData?.taxExclusive || "Tax Exclusive");
    const isTaxInclusive = taxModeLabel.toLowerCase().includes("inclusive");
    const discountValue = toNumber(invoiceData?.discountAmount ?? invoiceData?.discount);
    const discountType = String(invoiceData?.discountType || "%").toLowerCase();
    const discountBase = Math.max(0, isTaxInclusive ? (subTotal - taxAmount) : subTotal);
    const discountAmount = discountValue > 0
      ? ((discountType.includes("%") || discountType.includes("percent"))
        ? (discountBase * discountValue) / 100
        : discountValue)
      : 0;

    const shippingCharges = toNumber(invoiceData?.shippingCharges ?? invoiceData?.shipping);
    const adjustment = toNumber(invoiceData?.adjustment);
    const roundOff = toNumber(invoiceData?.roundOff);
    const total = getInvoiceDisplayTotal(invoiceData);
    const paidAmount = toNumber(invoiceData?.amountPaid);
    const balance = invoiceData?.balance !== undefined
      ? toNumber(invoiceData?.balance)
      : invoiceData?.balanceDue !== undefined
        ? toNumber(invoiceData?.balanceDue)
        : Math.max(0, total - paidAmount);
    const discountRate = discountAmount > 0 && discountBase > 0 ? (discountAmount / discountBase) * 100 : 0;
    const discountLabel = discountAmount > 0 ? `Discount(${discountRate.toFixed(2)}%)` : "Discount";
    const taxLabel = invoiceData?.taxName || invoiceData?.taxLabel || "Tax";

    return {
      subTotal,
      taxAmount,
      taxLabel,
      taxModeLabel,
      discountAmount,
      discountBase,
      discountLabel,
      shippingCharges,
      adjustment,
      roundOff,
      total,
      paidAmount,
      balance,
    };
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatDateShort = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const generateInvoicePaperHTML = (invoiceData: any) => {
    const invoiceDate = invoiceData.invoiceDate || invoiceData.date || new Date().toISOString();
    const formattedDate = formatDateShort(invoiceDate);
    const dueDate = invoiceData.dueDate ? formatDateShort(invoiceData.dueDate) : formattedDate;
    const customerName =
      invoiceData.customerName ||
      (typeof invoiceData.customer === "string" ? invoiceData.customer : invoiceData.customer?.displayName || invoiceData.customer?.companyName) ||
      "N/A";
    const totalsMeta = getInvoiceTotalsMeta(invoiceData);
    const notes = invoiceData.customerNotes || invoiceData.notes || "";
    const items = normalizeInvoiceItems(invoiceData);

    const itemsHTML = items.length
      ? items.map((item: any, index: number) => {
        const quantity = toNumber(item.displayQuantity ?? item.quantity);
        const rate = toNumber(item.displayRate ?? item.rate ?? item.unitPrice ?? item.price);
        const amount = toNumber(item.displayAmount ?? item.amount ?? item.total ?? (quantity * rate));
        const unit = item.displayUnit || item.unit || item.unitName || "pcs";
        const itemName = item.displayName || "N/A";

        return `
          <tr>
            <td class="col-number">${index + 1}</td>
            <td class="col-item">${escapeHtml(itemName)}</td>
            <td class="col-qty">${quantity.toFixed(2)} ${escapeHtml(unit)}</td>
            <td class="col-rate">${rate.toFixed(2)}</td>
            <td class="col-amount">${amount.toFixed(2)}</td>
          </tr>
        `;
      }).join("")
      : '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No items</td></tr>';

    const paymentMadeRow = totalsMeta.paidAmount > 0
      ? `
        <tr>
          <td>Payment Made</td>
          <td>(-) ${escapeHtml(formatCurrency(totalsMeta.paidAmount, invoiceData.currency))}</td>
        </tr>
      `
      : "";

    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .invoice-container { width: 794px; min-height: 1123px; background: #fff; padding: 38px 46px; font-family: Arial, sans-serif; color: #1f2937; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .company-info h1 { font-size: 24px; letter-spacing: 0.4px; margin-bottom: 10px; }
        .company-info p { font-size: 13px; line-height: 1.5; color: #4b5563; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { font-size: 46px; font-weight: 500; letter-spacing: 1px; margin-bottom: 4px; color: #111827; }
        .invoice-number { font-size: 20px; margin-bottom: 14px; }
        .balance-due-label { font-size: 14px; color: #6b7280; margin-bottom: 3px; }
        .balance-due { font-size: 30px; font-weight: 700; color: #111827; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin: 8px 0 26px; }
        .bill-to h3 { font-size: 14px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
        .bill-to p { font-size: 16px; font-weight: 600; }
        .invoice-details p { display: flex; justify-content: space-between; gap: 14px; font-size: 14px; margin-bottom: 7px; }
        .invoice-details p span { color: #6b7280; }
        table.items-table { width: 100%; border-collapse: collapse; margin: 14px 0 20px; }
        .items-table thead { background-color: #2f3640; color: #fff; }
        .items-table th { padding: 11px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .items-table td { padding: 11px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .col-number { width: 7%; }
        .col-item { width: 48%; }
        .col-qty { width: 15%; }
        .col-rate { width: 15%; }
        .col-amount { width: 15%; text-align: right; }
        .summary { display: flex; justify-content: flex-end; margin-top: 6px; }
        .summary-table { width: 340px; border-collapse: collapse; }
        .summary-table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
        .summary-table tr.note td { border-bottom: none; padding-top: 0; color: #6b7280; font-size: 12px; }
        .summary-table tr.total-line td { font-weight: 700; }
        .summary-table td:last-child { text-align: right; }
        .summary-table tr.total td { font-size: 20px; font-weight: 700; border-bottom: none; padding-top: 14px; }
        .notes { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 14px; }
        .notes h3 { font-size: 14px; margin-bottom: 8px; }
        .notes p { font-size: 13px; color: #4b5563; line-height: 1.6; }
      </style>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>TABAN ENTERPRISES</h1>
            <p>mogadishu 00252</p>
          </div>
          <div class="invoice-info">
            <h2>${invoiceData.debitNote ? "DEBIT NOTE" : "INVOICE"}</h2>
            <div class="invoice-number"># ${escapeHtml(invoiceData.invoiceNumber || invoiceData.id)}</div>
            <div class="balance-due-label">Balance Due</div>
            <div class="balance-due">${escapeHtml(formatCurrency(totalsMeta.balance, invoiceData.currency))}</div>
          </div>
        </div>

        <div class="details">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p>${escapeHtml(customerName)}</p>
          </div>
          <div class="invoice-details">
            <p><span>${invoiceData.debitNote ? "Debit Note Date" : "Invoice Date"} :</span> <strong>${escapeHtml(formattedDate)}</strong></p>
            <p><span>Terms :</span> <strong>${escapeHtml(invoiceData.paymentTerms || "Due on Receipt")}</strong></p>
            <p><span>Due Date :</span> <strong>${escapeHtml(dueDate)}</strong></p>
            ${invoiceData.orderNumber ? `<p><span>P.O.# :</span> <strong>${escapeHtml(invoiceData.orderNumber)}</strong></p>` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-number">#</th>
              <th class="col-item">Item & Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-rate">Rate</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="summary">
          <table class="summary-table">
            <tr>
              <td>Sub Total</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.subTotal, invoiceData.currency))}</td>
            </tr>
            <tr class="note"><td colspan="2">(${escapeHtml(totalsMeta.taxModeLabel)})</td></tr>
            ${totalsMeta.discountAmount > 0 ? `
              <tr><td>${escapeHtml(totalsMeta.discountLabel)}</td><td>(-) ${escapeHtml(formatCurrency(totalsMeta.discountAmount, invoiceData.currency))}</td></tr>
              <tr class="note"><td colspan="2">(Applied on ${escapeHtml(formatCurrency(totalsMeta.discountBase, invoiceData.currency))})</td></tr>
            ` : ""}
            ${totalsMeta.taxAmount > 0 ? `<tr><td>${escapeHtml(totalsMeta.taxLabel)}</td><td>${escapeHtml(formatCurrency(totalsMeta.taxAmount, invoiceData.currency))}</td></tr>` : ""}
            ${totalsMeta.shippingCharges !== 0 ? `<tr><td>Shipping charge</td><td>${escapeHtml(formatCurrency(totalsMeta.shippingCharges, invoiceData.currency))}</td></tr>` : ""}
            ${totalsMeta.adjustment !== 0 ? `<tr><td>Adjustment</td><td>${escapeHtml(formatCurrency(totalsMeta.adjustment, invoiceData.currency))}</td></tr>` : ""}
            ${totalsMeta.roundOff !== 0 ? `<tr><td>Round Off</td><td>${escapeHtml(formatCurrency(totalsMeta.roundOff, invoiceData.currency))}</td></tr>` : ""}
            <tr class="total-line"><td>Total</td><td>${escapeHtml(formatCurrency(totalsMeta.total, invoiceData.currency))}</td></tr>
            ${paymentMadeRow}
            <tr class="total"><td>BALANCE DUE</td><td>${escapeHtml(formatCurrency(totalsMeta.balance, invoiceData.currency))}</td></tr>
          </table>
        </div>

        ${notes ? `<div class="notes"><h3>Notes</h3><p>${escapeHtml(notes)}</p></div>` : ""}
      </div>
    `;
  };

  const renderHtmlToPdfBlob = async (html: string): Promise<Blob> => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    tempDiv.style.background = "#ffffff";
    tempDiv.style.width = "794px";
    document.body.appendChild(tempDiv);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgHeight = (canvas.height * printableWidth) / canvas.width;
      let heightLeft = imgHeight;
      let yPosition = margin;

      pdf.addImage(imgData, "PNG", margin, yPosition, printableWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        pdf.addPage();
        yPosition = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, yPosition, printableWidth, imgHeight);
        heightLeft -= printableHeight;
      }
      return pdf.output("blob");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resolveCustomerId = (invoiceData: any) => {
    const candidate = invoiceData?.customerId || invoiceData?.customer?._id || invoiceData?.customer?.id || invoiceData?.customer;
    return typeof candidate === "string" ? candidate : "";
  };

  const generateCustomerStatementHTML = (invoiceData: any, customerInvoices: any[]) => {
    const displayCustomerName =
      invoiceData?.customerName ||
      (typeof invoiceData?.customer === "string" ? invoiceData.customer : invoiceData?.customer?.displayName || invoiceData?.customer?.companyName) ||
      "Customer";

    const now = new Date();
    const statementDate = formatDateShort(now);

    let runningBalance = 0;
    const rows = customerInvoices
      .sort((a: any, b: any) => new Date(a.invoiceDate || a.date || 0).getTime() - new Date(b.invoiceDate || b.date || 0).getTime())
      .map((inv: any) => {
        const total = getInvoiceDisplayTotal(inv);
        const paid = toNumber(inv.amountPaid ?? inv.paidAmount);
        runningBalance += (total - paid);
        return `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px;">${escapeHtml(formatDateShort(inv.invoiceDate || inv.date))}</td>
            <td style="padding: 12px; color: #156372; font-weight: 600;">${escapeHtml(inv.invoiceNumber || inv.id || "-")}</td>
            <td style="padding: 12px;">${escapeHtml(String(inv.status || "draft").toUpperCase())}</td>
            <td style="padding: 12px; text-align: right;">${escapeHtml(toNumber(total).toFixed(2))}</td>
            <td style="padding: 12px; text-align: right; color: #48bb78;">${escapeHtml(toNumber(paid).toFixed(2))}</td>
            <td style="padding: 12px; text-align: right; font-weight: 600;">${escapeHtml(toNumber(runningBalance).toFixed(2))}</td>
          </tr>
        `;
      }).join("");

    return `
      <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase;">TABAN BOOKS</h1>
            <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">Customer Statement</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 30px; font-weight: 900; color: #2d3748; text-transform: uppercase;">Statement</h2>
            <div style="margin-top: 8px; font-size: 13px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
              ${escapeHtml(statementDate)}
            </div>
          </div>
        </div>
        <div style="height: 1px; background: #e2e8f0; margin-bottom: 28px;"></div>
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
          <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${escapeHtml(displayCustomerName)}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #156372; color: white;">
              <th style="padding: 12px; text-align: left;">DATE</th>
              <th style="padding: 12px; text-align: left;">INVOICE</th>
              <th style="padding: 12px; text-align: left;">STATUS</th>
              <th style="padding: 12px; text-align: right;">AMOUNT</th>
              <th style="padding: 12px; text-align: right;">PAYMENTS</th>
              <th style="padding: 12px; text-align: right;">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 12px;">${escapeHtml(statementDate)}</td>
              <td style="padding: 12px; font-weight: 600;">Opening Balance</td>
              <td style="padding: 12px;">-</td>
              <td style="padding: 12px; text-align: right;">0.00</td>
              <td style="padding: 12px; text-align: right;">0.00</td>
              <td style="padding: 12px; text-align: right; font-weight: 600;">0.00</td>
            </tr>
            ${rows || `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #6b7280;">No transactions</td></tr>`}
          </tbody>
        </table>
        <div style="margin-top: 22px; text-align: right; font-size: 16px; font-weight: 700; color: #156372;">
          Balance Due: ${escapeHtml(toNumber(runningBalance).toFixed(2))}
        </div>
      </div>
    `;
  };

  const handleSend = async () => {
    if (!emailData.sendTo) {
      toast.error("Please enter a recipient email address");
      return;
    }

    setLoading(true);
    setSendingStage("Preparing email...");
    try {
      const outgoingAttachments: Array<any> = [];
      let attachSystemPdfFallback = false;
      const invoiceNumber = invoice.invoiceNumber || invoice.id || "invoice";
      const htmlBody = bodyEditorRef.current?.innerHTML || emailData.body || "";

      if (attachInvoicePDF) {
        try {
          setSendingStage("Generating invoice PDF...");
          const invoiceHtml = generateInvoicePaperHTML(invoice);
          const invoiceBlob = await renderHtmlToPdfBlob(invoiceHtml);
          const invoicePdfDataUrl = await blobToDataUrl(invoiceBlob);
          outgoingAttachments.push({
            filename: `${String(invoiceNumber).replace(/[\\/:*?"<>|]/g, "_")}.pdf`,
            content: invoicePdfDataUrl,
            contentType: "application/pdf",
            encoding: "base64",
          });
        } catch (pdfError) {
          console.error("Error generating invoice PDF attachment, falling back to server PDF:", pdfError);
          attachSystemPdfFallback = true;
        }
      }

      if (attachCustomerStatement) {
        try {
          setSendingStage("Generating customer statement...");
          const customerId = resolveCustomerId(invoice);
          const allInvoices = await getInvoices();
          const customerInvoices = (allInvoices || []).filter((inv: any) => {
            const invCustomerId = resolveCustomerId(inv);
            if (customerId && invCustomerId) return invCustomerId === customerId;
            const invCustomerName = getCustomerDisplayName(inv).toLowerCase();
            const currentCustomerName = getCustomerDisplayName(invoice).toLowerCase();
            return currentCustomerName.length > 0 && invCustomerName === currentCustomerName;
          });

          const statementHtml = generateCustomerStatementHTML(invoice, customerInvoices);
          const statementBlob = await renderHtmlToPdfBlob(statementHtml);
          const statementDataUrl = await blobToDataUrl(statementBlob);
          const statementCustomerName = getCustomerDisplayName(invoice).replace(/[\\/:*?"<>|]/g, "_");
          outgoingAttachments.push({
            filename: `Statement-${statementCustomerName}-${new Date().toISOString().split("T")[0]}.pdf`,
            content: statementDataUrl,
            contentType: "application/pdf",
            encoding: "base64",
          });
        } catch (statementError) {
          console.error("Error generating customer statement attachment:", statementError);
          toast.error("Customer statement PDF could not be generated. Email will still be sent.");
        }
      }

      if (attachments.length > 0) {
        setSendingStage("Preparing attachments...");
        const customFiles = await Promise.all(
          attachments.map(async (attachment: any) => {
            if (!attachment?.file) return null;
            const dataUrl = await fileToDataUrl(attachment.file);
            return {
              filename: attachment.name || attachment.file.name,
              content: dataUrl,
              contentType: attachment.type || attachment.file.type || "application/octet-stream",
              encoding: "base64",
            };
          })
        );
        outgoingAttachments.push(...customFiles.filter(Boolean));
      }

      setSendingStage("Sending email...");
      await invoicesAPI.sendEmail(id, {
        to: emailData.sendTo,
        subject: emailData.subject,
        body: htmlBody,
        from: emailData.from,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachSystemPDF: attachSystemPdfFallback,
        attachments: outgoingAttachments
      });

      toast.success("Email sent successfully!");
      navigate(`/sales/invoices/${id}`);
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      toast.error(error.message || "Failed to send email. Please try again.");
    } finally {
      setLoading(false);
      setSendingStage("");
    }
  };

  const handleCancel = () => {
    navigate(`/sales/invoices`);
  };

  if (!invoice) {
    return null;
  }

  const customerDisplayName = getCustomerDisplayName(invoice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Email To {customerDisplayName}
          </h1>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="bg-white border border-gray-200 mb-6">
          {/* From Field */}
          <div className="grid grid-cols-[120px_1fr] items-center border-b border-gray-200 px-4">
            <label className="text-sm text-gray-600 py-3 flex items-center gap-1">
              From
              <HelpCircle size={14} className="text-gray-400 cursor-help" />
            </label>
            <input
              type="text"
              value={emailData.from}
              onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
              className="w-full py-3 border-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Send To Field */}
          <div className="grid grid-cols-[120px_1fr] items-center border-b border-gray-200 px-4">
            <label className="text-sm text-gray-600 py-3">Send To</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={emailData.sendTo}
                onChange={(e) => setEmailData({ ...emailData, sendTo: e.target.value })}
                className="flex-1 py-3 border-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                placeholder="Enter email address"
              />
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  onClick={() => setShowCc(!showCc)}
                >
                  Cc
                </button>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  onClick={() => setShowBcc(!showBcc)}
                >
                  Bcc
                </button>
              </div>
            </div>
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className="grid grid-cols-[120px_1fr] items-center border-b border-gray-200 px-4">
              <label className="text-sm text-gray-600 py-3">Cc</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                  className="flex-1 py-3 border-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                />
                <button
                  className="p-1.5 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => {
                    setEmailData({ ...emailData, cc: "" });
                    setShowCc(false);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="grid grid-cols-[120px_1fr] items-center border-b border-gray-200 px-4">
              <label className="text-sm text-gray-600 py-3">Bcc</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailData.bcc}
                  onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                  className="flex-1 py-3 border-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                />
                <button
                  className="p-1.5 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => {
                    setEmailData({ ...emailData, bcc: "" });
                    setShowBcc(false);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div className="grid grid-cols-[120px_1fr] items-center border-b border-gray-200 px-4">
            <label className="text-sm text-gray-600 py-3">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="w-full py-3 border-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Rich Text Editor Toolbar */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
            <button
              type="button"
              className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isBold ? 'bg-gray-200' : ''}`}
              onClick={() => setIsBold(!isBold)}
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isItalic ? 'bg-gray-200' : ''}`}
              onClick={() => setIsItalic(!isItalic)}
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isUnderline ? 'bg-gray-200' : ''}`}
              onClick={() => setIsUnderline(!isUnderline)}
            >
              <Underline size={16} />
            </button>
            <button
              type="button"
              className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isStrikethrough ? 'bg-gray-200' : ''}`}
              onClick={() => setIsStrikethrough(!isStrikethrough)}
            >
              <Strikethrough size={16} />
            </button>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer"
            >
              <option value="12">12 px</option>
              <option value="14">14 px</option>
              <option value="16">16 px</option>
              <option value="18">18 px</option>
              <option value="20">20 px</option>
              <option value="24">24 px</option>
            </select>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <AlignLeft size={16} />
            </button>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <AlignCenter size={16} />
            </button>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <AlignRight size={16} />
            </button>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <AlignJustify size={16} />
            </button>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <LinkIcon size={16} />
            </button>
            <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
              <ImageIcon size={16} />
            </button>
          </div>

          {/* Email Body Editor */}
          <div
            ref={bodyEditorRef}
            contentEditable
            className="min-h-[400px] p-4 border border-gray-300 rounded-md text-sm outline-none bg-white overflow-y-auto"
            style={{
              fontWeight: isBold ? "bold" : "normal",
              fontStyle: isItalic ? "italic" : "normal",
              textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
              fontSize: `${fontSize}px`,
            }}
            onInput={(e) => {
              setIsBodyDirty(true);
              setEmailData({ ...emailData, body: (e.target as HTMLElement).innerHTML || "" });
            }}
            suppressContentEditableWarning={true}
          />

          {/* Attachments Section */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            {/* Attach Invoice PDF Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachInvoicePDF}
                  onChange={(e) => setAttachInvoicePDF(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Attach {invoice.debitNote ? "Debit Note" : "Invoice"} PDF</span>
              </label>
              {attachInvoicePDF && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <FileText size={16} className="text-red-500" />
                  <span className="flex-1 text-sm text-gray-900">{invoice.invoiceNumber || invoice.id}</span>
                </div>
              )}
            </div>

            {/* Attach Customer Statement Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachCustomerStatement}
                  onChange={(e) => setAttachCustomerStatement(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Attach Customer Statement</span>
              </label>
              {attachCustomerStatement && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <FileText size={16} className="text-red-500" />
                  <span className="flex-1 text-sm text-gray-900">
                    Statement-{customerDisplayName}
                  </span>
                </div>
              )}
            </div>

            {/* Other Attachments */}
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md mb-2 bg-gray-50">
                <FileText size={16} className="text-gray-500" />
                <span className="flex-1 text-sm text-gray-900">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachments(attachments.filter((_, i) => i !== index));
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
              Attachments
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                const newAttachments = files.map(file => ({
                  name: file.name,
                  type: file.type,
                  file: file,
                }));
                setAttachments([...attachments, ...newAttachments]);
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 \${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (sendingStage || "Sending...") : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

