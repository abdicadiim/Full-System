import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI, reportingTagsAPI, senderEmailsAPI } from "../../../services/api";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import {
    X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
    Settings, User, Mail, Phone, MapPin, Globe,
    DollarSign, TrendingUp, Calendar, UserPlus,
    ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline, ChevronRight as ChevronRightIcon,
    Filter, ArrowUpDown, Search, ChevronLeft, Link2, FileText, Monitor, Check, Upload, Trash2, Loader2, Download, RefreshCw, AlertTriangle, Smartphone
} from "lucide-react";
import { Customer, Invoice, CreditNote, AttachedFile, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import CustomerCommentsPanel from "../CustomerDetail/CustomerCommentsPanel";
import CustomerAttachmentsPopover from "../CustomerDetail/CustomerAttachmentsPopover";
import { buildStatementDateRange } from "./customerDetailStatementHelpers";

import type { ExtendedCustomer, Transaction, Comment, Mail as CustomerMail } from "../CustomerDetail/CustomerDetail.shared";
import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";

export function useCustomerDetailTools(detail: any) {
    const {
        cloneContactType,
        creditNotes,
        customer,
        customers,
        displayName,
        id,
        fileInputRef,
        invoices,
        isStatementDownloading,
        mapDocumentsToAttachments,
        mergeCustomerSearch,
        mergeTargetCustomer,
        navigate,
        organizationName,
        organizationNameHtml,
        organizationProfile,
        ownerEmail,
        payments,
        reloadSidebarCustomerList,
        setAttachments,
        setCloneContactType,
        setCustomer,
        setEmailNotifications,
        setIsAssociateTemplatesModalOpen,
        setIsBulkActionsDropdownOpen,
        setIsCloneModalOpen,
        setIsCloning,
        setIsMergeCustomerDropdownOpen,
        setIsMergeModalOpen,
        setIsMoreDropdownOpen,
        setIsStatementDownloading,
        setIsUploadingAttachments,
        setMergeCustomerSearch,
        setMergeTargetCustomer,
        setOpenTemplateDropdown,
        setPdfTemplates,
        setTemplateSearches,
        statementPeriod,
        statementTransactions,
        templateSearches,
        vendors,
    } = detail as any;
    const getStatementDateRange = () => buildStatementDateRange(statementPeriod);

    const handlePrintStatement = () => {
        if (!customer) return;

        const { startDate, endDate } = buildStatementDateRange(statementPeriod);
        const openingBalance = parseFloat(String(customer?.openingBalance || 0));
        const invoicedAmount = invoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total || inv.amount || 0)), 0);
        const amountReceived = payments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amountReceived || p.amount || 0)), 0);
        const totalCreditNotes = creditNotes.reduce((sum: number, cn: any) => sum + parseFloat(String(cn.total || cn.amount || 0)), 0);
        const balanceDue = openingBalance + invoicedAmount - amountReceived - totalCreditNotes;
        const currencyCode = customer?.currency || "USD";

        const printWindow = window.open('', '_blank');
        const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Statement - ${displayName || 'Customer'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 40px; color: #1f2937; line-height: 1.4; }
          .statement-container { max-width: 1000px; margin: 0 auto; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .mb-1 { margin-bottom: 4px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-10 { margin-bottom: 40px; }
          .mb-12 { margin-bottom: 48px; }
          .mb-14 { margin-bottom: 56px; }
          .text-[17px] { font-size: 17px; }
          .text-[13px] { font-size: 13px; }
          .text-[11px] { font-size: 11px; }
          .text-[22px] { font-size: 22px; }
          .font-medium { font-weight: 500; }
          .font-bold { font-weight: 700; }
          .font-extrabold { font-weight: 800; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-900 { color: #111827; }
          .text-blue-600 { color: #2563eb; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-start { align-items: flex-start; }
          .items-end { align-items: flex-end; }
          .flex-col { flex-direction: column; }
          .gap-16 { gap: 64px; }
          .w-full { width: 100%; }
          .h-[2px] { height: 2px; }
          .bg-gray-900 { background-color: #111827; }
          .bg-dark { background-color: #2a2a2a; color: white !important; -webkit-print-color-adjust: exact; }
          .border-t-heavy { border-top: 3px solid #111827; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .py-3 { padding-top: 12px; padding-bottom: 12px; }
          .py-4 { padding-top: 16px; padding-bottom: 16px; }
          .py-2-5 { padding-top: 10px; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border-bottom: 1px solid #f3f4f6; padding: 10px; }
          th { text-align: left; color: white; }
          .summary-box { width: 360px; border-top: 2px solid #e5e7eb; }
          .tracking-tight { letter-spacing: -0.025em; }
          .tracking-wider { letter-spacing: 0.05em; }
          @media print {
            body { padding: 20px; }
            .bg-dark { background-color: #2a2a2a !important; color: white !important; }
            th { color: white !important; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="statement-container">
          <div class="flex justify-between items-start mb-12">
            <div class="flex gap-6 items-start">
              <div class="flex-shrink-0">
                ${organizationProfile?.logo ?
                `<img src="${organizationProfile.logo}" alt="Logo" style="max-width: 100px; max-height: 80px; object-fit: contain;" />` :
                `<div style="font-size: 40px;">📖</div>`}
              </div>
              <div class="flex flex-col">
                <div class="text-[18px] font-bold text-gray-900 mb-1">
                  ${organizationProfile?.organizationName || organizationProfile?.name || "TABAN ENTERPRISES"}
                </div>
                <div class="text-[14px] text-gray-600">
                  ${organizationProfile?.address?.street1 ? `<div>${organizationProfile.address.street1}</div>` : ''}
                  ${organizationProfile?.address?.street2 ? `<div>${organizationProfile.address.street2}</div>` : ''}
                  ${(organizationProfile?.address?.city || organizationProfile?.address?.state || organizationProfile?.address?.zipCode) ?
                `<div>${[organizationProfile.address.city, organizationProfile.address.state, organizationProfile.address.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                  ${organizationProfile?.address?.country ? `<div>${organizationProfile.address.country}</div>` : ''}
                  <div class="mt-1">${ownerEmail?.email || organizationProfile?.email || ""}</div>
                </div>
              </div>
            </div>

            <div class="text-right">
              <h2 class="text-[32px] font-bold text-gray-900 mb-2">STATEMENT</h2>
              <div class="text-[14px] text-gray-600">
                ${startDate.toLocaleDateString('en-GB')} To ${endDate.toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          <div class="mb-8">
            <div class="text-[14px] font-bold text-gray-900 mb-2">To</div>
            <div class="text-[16px] font-medium text-blue-600">${displayName}</div>
          </div>

              <div class="summary-box">
                <div style="background-color: #f3f4f6; padding: 6px 12px; font-weight: bold; font-size: 11px; color: #374151; text-align: left; text-transform: uppercase;">Account Summary</div>
                <div class="flex justify-between px-3 py-2 text-[13px]">
                  <span>Opening Balance</span>
                  <span class="font-bold">${currencyCode} ${openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="flex justify-between px-3 py-2 text-[13px]">
                  <span>Invoiced Amount</span>
                  <span class="font-bold">${currencyCode} ${invoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="flex justify-between px-3 py-2 text-[13px]">
                  <span>Amount Received</span>
                  <span class="font-bold">${currencyCode} ${amountReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="flex justify-between px-3 py-2 text-[13px] font-bold border-t-heavy">
                  <span>Balance Due</span>
                  <span>${currencyCode} ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr class="bg-dark">
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider">Date</th>
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider">Transactions</th>
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider">Details</th>
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider text-right">Amount</th>
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider text-right">Payments</th>
                <th class="py-2-5 px-3 uppercase text-[11px] font-bold tracking-wider text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${openingBalance !== 0 ? `
                <tr>
                  <td class="py-3 px-3 text-[13px]">01/01/${new Date().getFullYear()}</td>
                  <td class="py-3 px-3 text-[13px] italic font-medium text-gray-900">***Opening Balance***</td>
                  <td class="py-3 px-3 text-[13px]"></td>
                  <td class="py-3 px-3 text-[13px] text-right font-medium">${openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="py-3 px-3 text-[13px] text-right">0.00</td>
                  <td class="py-3 px-3 text-[13px] text-right font-bold">${(openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
                ${statementTransactions.map((transaction: any) => `
                <tr>
                  <td class="py-3 px-3 text-[13px] font-medium">${new Date(transaction.date).toLocaleDateString('en-GB')}</td>
                  <td class="py-3 px-3 text-[13px] italic font-medium text-gray-900">***${transaction.type}***</td>
                  <td class="py-3 px-3 text-[13px] text-blue-600 font-bold">${transaction.detailsLink || ''}</td>
                  <td class="py-3 px-3 text-[13px] text-right font-medium">${transaction.amount !== 0 ? transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                  <td class="py-3 px-3 text-[13px] text-right">${transaction.payments !== 0 ? transaction.payments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                  <td class="py-3 px-3 text-[13px] text-right font-bold">${(transaction.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="flex justify-end gap-16 py-4 px-3">
            <div class="text-[13px] font-bold text-gray-900 uppercase tracking-tight">Balance Due</div>
            <div class="text-[13px] font-bold text-gray-900">
              ${currencyCode} ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { 
            setTimeout(() => {
              window.print(); 
              window.close();
            }, 700);
          }
        </script>
      </body>
      </html>
    `;

        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    };

    const handleDownloadPDF = async () => {
        if (!customer || isStatementDownloading) return;

        setIsStatementDownloading(true);

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const receivables = parseFloat(String(customer.receivables || customer.openingBalance || 0));
        const currency = customer.currency || "USD";

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        document.body.appendChild(container);

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            container.innerHTML = `
          <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">${organizationNameHtml}</h1>
                <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
                  <p style="margin: 2px 0;">${organizationProfile?.address?.country || "Aland Islands"}</p>
                  <p style="margin: 2px 0;">${ownerEmail?.email || organizationProfile?.email || ""}</p>
                </div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #2d3748; text-transform: uppercase; line-height: 1;">Statement</h2>
                <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${dateStr} - ${dateStr}
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #e2e8f0; margin-bottom: 40px;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
                <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${displayName || 'N/A'}</div>
                ${customer.companyName ? `<div style="font-size: 14px; color: #4a5568; margin-top: 4px;">${customer.companyName}</div>` : ''}
                <div style="font-size: 14px; color: #4a5568; margin-top: 2px;">${customer.email || ''}</div>
              </div>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; color: #2d3748; font-weight: 700; border-bottom: 2px solid #156372; display: inline-block; padding-bottom: 4px;">Account Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Opening Balance</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Invoiced Amount</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Amount Received</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #48bb78;">${currency} 0.00</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-weight: 800; color: #1a202c; font-size: 16px;">Balance Due</td>
                    <td style="text-align: right; padding: 12px 0 0 0; font-weight: 800; color: #156372; font-size: 18px;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="margin-bottom: 60px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #156372; color: white;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700; border-radius: 8px 0 0 8px;">DATE</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">TRANSACTIONS</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">DETAILS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">AMOUNT</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">PAYMENTS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700; border-radius: 0 8px 8px 0;">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600;">Opening Balance</td>
                    <td style="padding: 15px; color: #718096;">Initial balance</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; color: #48bb78;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">0.00</td>
                  </tr>
                  <tr style="background: #fcfcfc; border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600; color: #156372;">Invoice</td>
                    <td style="padding: 15px; color: #718096;">Account Balance Adjustment</td>
                    <td style="padding: 15px; text-align: right;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #156372;">
                    <td colspan="4" style="padding: 20px 15px; text-align: right; font-weight: 800; font-size: 14px; color: #2d3748;">NET BALANCE DUE</td>
                    <td style="padding: 20px 15px; text-align: right;"></td>
                    <td style="padding: 20px 15px; text-align: right; font-weight: 900; font-size: 15px; color: #156372;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 10px;">
              <p style="margin: 0; font-weight: 600;">Generated professionally by ${organizationNameHtml}</p>
              <p style="margin: 4px 0 0 0;">Report Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        `;

            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            pdf.save(`Statements_${today.toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            toast.error("Error generating PDF. Please try again.");
        } finally {
            try {
                document.body.removeChild(container);
            } catch (e) {
                // no-op
            }
            setIsStatementDownloading(false);
        }
    };

    const handleDownloadExcel = () => {
        if (!customer) return;

        const { startDate, endDate } = getStatementDateRange();
        const openingBalance = parseFloat(String(customer?.openingBalance || 0));
        const invoicedAmount = invoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total || inv.amount || 0)), 0);
        const amountReceived = payments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amountReceived || p.amount || 0)), 0);
        const balanceDue = openingBalance + invoicedAmount - amountReceived - creditNotes.reduce((sum: number, cn: any) => sum + parseFloat(String(cn.total || cn.amount || 0)), 0);

        // Create CSV content
        const headers = ['Date', 'Transactions', 'Details', 'Amount', 'Payments', 'Balance'];
        const csvRows = [
            [organizationProfile?.organizationName || organizationProfile?.name || "TABAN ENTERPRISES"],
            [organizationProfile?.address?.street1 || ""],
            [organizationProfile?.address?.street2 || ""],
            [[organizationProfile?.address?.city, organizationProfile?.address?.state, organizationProfile?.address?.zipCode].filter(Boolean).join(", ")],
            [organizationProfile?.address?.country || ""],
            [ownerEmail?.email || organizationProfile?.email || ""],
            [''],
            ['Customer Statement for ' + displayName],
            ['From ' + startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' To ' + endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
            [''],
            ['Account Summary'],
            ['Opening Balance', '', '', `${customer?.currency || "AMD"} ${openingBalance.toFixed(2)}`, '', ''],
            ['Invoiced Amount', '', '', `${customer?.currency || "AMD"} ${invoicedAmount.toFixed(2)}`, '', ''],
            ['Amount Received', '', '', `${customer?.currency || "AMD"} ${amountReceived.toLocaleString()}`, '', ''],
            ['Balance Due', '', '', `${customer?.currency || "AMD"} ${balanceDue.toFixed(2)}`, '', ''],
            [''],
            headers.join(','),
            ...statementTransactions.map((transaction: any) => [
                new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                `"${(transaction.type || '').replace(/"/g, '""')}"`,
                `"${((transaction.detailsLink || transaction.details || '').replace(/"/g, '""'))}"`,
                transaction.amount !== 0 ? (transaction.amount < 0 ? `(${Math.abs(transaction.amount).toFixed(2)})` : transaction.amount.toFixed(2)) : '',
                transaction.payments !== 0 ? transaction.payments.toLocaleString() : '',
                transaction.balance.toFixed(2)
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `customer_statement_${displayName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        document.body.removeChild(link);
    };

    const handleMergeCustomers = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setMergeTargetCustomer(null);
        setMergeCustomerSearch("");
        setIsMergeCustomerDropdownOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleMergeSubmit = async () => {
        if (!mergeTargetCustomer) {
            toast.error("Please select a customer to merge with.");
            return;
        }
        if (!customer) {
            toast.error("Customer data not available.");
            return;
        }

        const sourceCustomer = customer;
        const sourceCustomerId = String(sourceCustomer.id || sourceCustomer._id || "").trim();
        const targetCustomer = mergeTargetCustomer;
        const targetCustomerId = String(targetCustomer.id || targetCustomer._id || "").trim();

        if (!sourceCustomerId || !targetCustomerId) {
            toast.error("Unable to determine customer IDs for merge.");
            return;
        }

        if (sourceCustomerId === targetCustomerId) {
            toast.error("Please select a different customer to merge with.");
            return;
        }

        try {
            await customersAPI.merge(targetCustomerId, [sourceCustomerId]);

            toast.success(`Successfully merged "${sourceCustomer.name || sourceCustomer.displayName}" into "${targetCustomer.name || targetCustomer.displayName}".`);
            setIsMergeModalOpen(false);
            setMergeTargetCustomer(null);
            setMergeCustomerSearch("");

            navigate(`/sales/customers/${targetCustomerId}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to merge customers");
        }
    };

    // Get customers available for merge (exclude current customer)
    const getMergeableCustomers = () => {
        const customerList = Array.isArray(customers) ? customers : [];
        return customerList.filter((c: any) => {
            const candidateId = String(c.id || c._id || "");
            if (candidateId === String(id)) return false;
            return true;
        });
    };

    const filteredMergeCustomers = getMergeableCustomers().filter((c: any) =>
        String(c?.name || c?.displayName || "").toLowerCase().includes(mergeCustomerSearch.toLowerCase()) ||
        String(c?.email || "").toLowerCase().includes(mergeCustomerSearch.toLowerCase())
    );

    const handleAssociateTemplates = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setIsAssociateTemplatesModalOpen(true);
    };

    const handleAssociateTemplatesSave = () => {
        // TODO: Implement actual save functionality
        setIsAssociateTemplatesModalOpen(false);
        toast.success("Templates associated successfully!");
    };

    const handleTemplateSelect = (category: string, field: string, value: string) => {
        if (category === "pdf") {
            setPdfTemplates((prev: any) => ({ ...prev, [field]: value }));
        } else {
            setEmailNotifications((prev: any) => ({ ...prev, [field]: value }));
        }
        setOpenTemplateDropdown(null);
        setTemplateSearches({});
    };

    const getFilteredTemplateOptions = (options: string[], field: string) => {
        const search = (templateSearches as any)[field] || "";
        return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !customer || !id) return;

        setIsUploadingAttachments(true);
        try {
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const filesArray = Array.from(files);

            if (currentDocuments.length + filesArray.length > 10) {
                toast.error("You can upload a maximum of 10 files.");
                return;
            }

            const oversizedFiles = filesArray.filter((file) => file.size > 10 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                toast.error("Each file must be 10MB or less.");
                return;
            }

            const uploadedDocuments: any[] = [];
            let persistedDocuments: any[] | null = null;
            for (const file of filesArray) {
                const uploadResponse = await documentsAPI.upload(file, {
                    name: file.name,
                    module: "Customers",
                    type: "other",
                    relatedToType: "customer",
                    relatedToId: String(id)
                });

                if (uploadResponse?.success && uploadResponse?.data) {
                    const document = uploadResponse.data as any;
                    uploadedDocuments.push({
                        id: String(document.documentId || document.id || document._id || file.name),
                        documentId: String(document.documentId || document.id || document._id || "").trim() || String(document.id || document._id || ""),
                        name: document.name || file.name,
                        size: Number(document.size || file.size || 0),
                        mimeType: document.mimeType || file.type || "application/octet-stream",
                        url: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        viewUrl: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        downloadUrl: document.downloadUrl || document.url || document.contentUrl || "",
                        uploadedAt: document.uploadedAt || new Date().toISOString()
                    });
                    if (Array.isArray(document.documents)) {
                        persistedDocuments = document.documents;
                    }
                }
            }

            if (uploadedDocuments.length === 0) {
                toast.error("Failed to upload files. Please try again.");
                return;
            }

            const nextDocuments = Array.isArray(persistedDocuments) && persistedDocuments.length > 0
                ? persistedDocuments
                : [...currentDocuments, ...uploadedDocuments];

            setCustomer((prev: any) => prev ? ({ ...prev, documents: nextDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(nextDocuments));

            toast.success(`${uploadedDocuments.length} file(s) uploaded successfully`);
        } catch (error) {
            toast.error('Failed to upload files: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsUploadingAttachments(false);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveAttachment = async (attachmentId: string | number) => {
        if (!customer || !id) return;

        try {
            const targetId = String(attachmentId || "").trim();
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const removedDocument = currentDocuments.find((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId === targetId || String(index + 1) === targetId;
            });
            const removedDocumentId = String(removedDocument?.documentId || removedDocument?.id || removedDocument?._id || targetId).trim();
            const updatedDocuments = currentDocuments.filter((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId !== targetId && String(index + 1) !== targetId;
            });

            if (!removedDocumentId) {
                throw new Error("Attachment not found.");
            }

            const deleteResponse = await documentsAPI.delete(String(removedDocumentId));
            const persistedDocuments = deleteResponse?.data?.documents || updatedDocuments;

            setCustomer((prev: any) => prev ? ({ ...prev, documents: persistedDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(persistedDocuments));

            toast.success('Attachment removed successfully');
        } catch (error) {
            toast.error('Failed to remove attachment: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleClone = () => {
        setIsMoreDropdownOpen(false);
        setCloneContactType("customer");
        handleCloneSubmit("customer");
    };

    const handleCloneSubmit = async (forcedType?: "customer" | "vendor") => {
        if (!customer) return;

        // Keep existing vendor behavior; auto-clone customer directly.
        const contactType = forcedType || cloneContactType;
        if (contactType === "vendor") {
            const clonedData = {
                ...customer,
                id: undefined,
                name: `${customer.name} (Clone)`,
                displayName: customer.displayName ? `${customer.displayName} (Clone)` : undefined
            };
            setIsCloneModalOpen(false);
            navigate("/purchases/vendors/new", { state: { clonedData } });
            return;
        }

        setIsCloning(true);
        try {
            const source: any = customer;
            const copySuffix = " (Clone)";

            const billingAddress = source.billingAddress || {
                attention: source.billingAttention || "",
                country: source.billingCountry || "",
                street1: source.billingStreet1 || "",
                street2: source.billingStreet2 || "",
                city: source.billingCity || "",
                state: source.billingState || "",
                zipCode: source.billingZipCode || "",
                phone: source.billingPhone || "",
                fax: source.billingFax || "",
            };

            const shippingAddress = source.shippingAddress || {
                attention: source.shippingAttention || "",
                country: source.shippingCountry || "",
                street1: source.shippingStreet1 || "",
                street2: source.shippingStreet2 || "",
                city: source.shippingCity || "",
                state: source.shippingState || "",
                zipCode: source.shippingZipCode || "",
                phone: source.shippingPhone || "",
                fax: source.shippingFax || "",
            };

            const clonedPayload = {
                displayName: `${source.displayName || source.name || "Customer"}${copySuffix}`,
                name: `${source.name || source.displayName || "Customer"}${copySuffix}`,
                status: "active",
                isActive: true,
                isInactive: false,
                customerType: source.customerType || "business",
                salutation: source.salutation || "",
                firstName: source.firstName || "",
                lastName: source.lastName || "",
                companyName: source.companyName || "",
                email: source.email || "",
                workPhone: source.workPhone || "",
                mobile: source.mobile || "",
                websiteUrl: source.websiteUrl || source.website || "",
                xHandle: source.xHandle || "",
                skypeName: source.skypeName || "",
                facebook: source.facebook || "",
                customerNumber: "",
                customerLanguage: source.customerLanguage || source.portalLanguage || "english",
                taxRate: source.taxRate || "",
                exchangeRate: parseFloat(String(source.exchangeRate || "1")) || 1,
                companyId: source.companyId || "",
                locationCode: source.locationCode || "",
                currency: source.currency || "USD",
                paymentTerms: source.paymentTerms || "due-on-receipt",
                department: source.department || "",
                designation: source.designation || "",
                accountsReceivable: source.accountsReceivable || "",
                openingBalance: String(source.openingBalance || source.receivables || "0"),
                receivables: parseFloat(String(source.receivables || source.openingBalance || "0")) || 0,
                enablePortal: !!source.enablePortal,
                customerOwner: source.customerOwner || "",
                remarks: source.remarks || source.notes || "",
                notes: source.notes || source.remarks || "",
                billingAddress,
                shippingAddress,
                contactPersons: Array.isArray(source.contactPersons)
                    ? source.contactPersons.map((cp: any) => {
                        const { id, _id, createdAt, updatedAt, ...rest } = cp || {};
                        return { ...rest };
                    })
                    : [],
                documents: Array.isArray(source.documents) ? [...source.documents] : [],
                customFields: source.customFields || {},
                reportingTags: source.reportingTags || []
            };

            const response: any = await customersAPI.create(clonedPayload);
            if (!response?.success) {
                throw new Error(response?.message || "Failed to clone customer");
            }

            const clonedCustomer = response?.data || {};

            window.dispatchEvent(new CustomEvent("customersUpdated", {
                detail: {
                    customer: clonedCustomer,
                    action: "created"
                }
            }));

            setIsCloneModalOpen(false);
            toast.success("Customer cloned successfully.");
            await reloadSidebarCustomerList();
            // Stay on the current customer after cloning.
        } catch (error: any) {
            toast.error(error?.message || "Failed to clone customer");
        } finally {
            setIsCloning(false);
        }
    };

    // Calendar helper functions
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const renderCalendar = (calendarMonth: Date, selectedDate: Date, onSelectDate: any, onPrevMonth: any, onNextMonth: any) => {
        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarMonth);
        const days = [];

        // Previous month days
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        const isSelected = (date: Date) => {
            return selectedDate &&
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();
        };

        const isToday = (date: Date) => {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        };

        return (
            <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                    <button className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer" onClick={onPrevMonth}>«</button>
                    <span className="text-sm font-semibold text-gray-900">{months[month]} {year}</span>
                    <button className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer" onClick={onNextMonth}>»</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {daysOfWeek.map(day => (
                        <div key={day} className="text-xs font-medium text-gray-600 text-center py-1">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((dayObj, index) => (
                        <button
                            key={index}
                            className={`w-8 h-8 text-xs rounded cursor-pointer transition-colors ${!dayObj.isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'
                                } ${isSelected(dayObj.date) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                                } ${isToday(dayObj.date) && !isSelected(dayObj.date) ? 'bg-blue-100 text-blue-700 font-semibold' : ''
                                }`}
                            onClick={() => onSelectDate(dayObj.date)}
                        >
                            {dayObj.day}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const invoiceStatusOptions = ["all", "draft", "client viewed", "partially paid", "unpaid", "overdue", "paid", "void"];
    const formatStatusLabel = (value: string) => value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const normalizeInvoiceStatus = (invoice: any) => {
        const raw = String(invoice?.status || "draft").toLowerCase();
        if (raw === "void") return "void";
        if (raw === "paid") return "paid";
        if (raw === "overdue") return "overdue";
        if (raw === "partially paid" || raw === "partial" || raw === "partial paid") return "partially paid";
        if (raw === "open" || raw === "unpaid") return "unpaid";
        if (raw === "sent" || raw === "viewed" || invoice?.customerViewed) return "client viewed";
        return "draft";
    };

    Object.assign(detail, {
        daysOfWeek,
        filteredMergeCustomers,
        formatDateForDisplay,
        formatMailDateTime,
        formatStatusLabel,
        getDaysInMonth,
        getFilteredTemplateOptions,
        getMergeableCustomers,
        getStatementDateRange,
        handleAssociateTemplates,
        handleAssociateTemplatesSave,
        handleClone,
        handleCloneSubmit,
        handleDownloadExcel,
        handleDownloadPDF,
        handleFileUpload,
        handleMergeCustomers,
        handleMergeSubmit,
        handlePrintStatement,
        handleRemoveAttachment,
        handleTemplateSelect,
        invoiceStatusOptions,
        months,
        normalizeInvoiceStatus,
        renderCalendar,
    });
    return detail;
}
