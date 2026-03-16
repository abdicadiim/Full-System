/**
 * Export utilities for Recurring Invoices
 */

import { jsPDF } from "jspdf";

/**
 * Format date for export
 */
const formatDateForExport = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  const date = new Date(String(dateString));
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

/**
 * Format currency for export
 */
const formatCurrencyForExport = (amount: number | string | null | undefined, currency = "AMD"): string => {
  const numAmount = parseFloat(String(amount || 0));
  return `${currency} ${numAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Escape CSV field (handles commas, quotes, and newlines)
 */
const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) return "";
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Export recurring invoices to CSV
 */
export const exportToCSV = (invoices: any[]): void => {
  // CSV Headers
  const headers = [
    "Customer Name",
    "Profile Name",
    "Frequency",
    "Last Invoice Date",
    "Next Invoice Date",
    "Status",
    "Amount"
  ];

  // Build CSV content
  let csvContent = headers.map(escapeCSVField).join(",") + "\n";

  invoices.forEach((invoice: any) => {
    const row = [
      invoice.customerName || invoice.customer || "",
      invoice.profileName || "",
      invoice.frequency || invoice.repeatEvery || "",
      formatDateForExport(invoice.lastInvoiceDate),
      formatDateForExport(invoice.nextInvoiceDate || invoice.startOn),
      (invoice.status || "active").toUpperCase(),
      formatCurrencyForExport(invoice.total || invoice.amount, invoice.currency)
    ];
    csvContent += row.map(escapeCSVField).join(",") + "\n";
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `recurring-invoices-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export recurring invoices to Excel (using HTML table approach)
 * This creates an Excel-compatible HTML file
 */
export const exportToExcel = (invoices: any[]): void => {
  // Create HTML table
  let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Recurring Invoices</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th {
          background-color: #4F46E5;
          color: white;
          font-weight: bold;
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
        }
        td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Profile Name</th>
            <th>Frequency</th>
            <th>Last Invoice Date</th>
            <th>Next Invoice Date</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
  `;

  invoices.forEach((invoice: any) => {
    htmlContent += `
      <tr>
        <td>${(invoice.customerName || invoice.customer || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${(invoice.profileName || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${(invoice.frequency || invoice.repeatEvery || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${formatDateForExport(invoice.lastInvoiceDate).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${formatDateForExport(invoice.nextInvoiceDate || invoice.startOn).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${(invoice.status || "active").toUpperCase().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${formatCurrencyForExport(invoice.total || invoice.amount, invoice.currency).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
      </tr>
    `;
  });

  htmlContent += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `recurring-invoices-${new Date().toISOString().split("T")[0]}.xls`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export recurring invoices to PDF using jsPDF
 */
export const exportToPDF = (invoices: any[]): void => {
  try {
    const doc = new jsPDF();
    
    // Set up PDF styling
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const startY = 20;
    let currentY = startY;
    
    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Recurring Invoices", margin, currentY);
    currentY += 10;
    
    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, currentY);
    currentY += 15;
    
    // Table setup
    const colWidths = [40, 35, 20, 25, 25, 15, 25];
    const headers = ["Customer Name", "Profile Name", "Frequency", "Last Invoice", "Next Invoice", "Status", "Amount"];
    const colX = [margin];
    
    // Calculate column X positions
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }
    
    // Draw table headers
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(79, 70, 229); // #4F46E5
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(255, 255, 255);
    
    headers.forEach((header, i) => {
      doc.text(header, colX[i] + 2, currentY + 5);
    });
    
    currentY += 8;
    doc.setTextColor(0, 0, 0);
    
    // Draw table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    invoices.forEach((invoice: any, index: number) => {
      // Check if we need a new page
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
        
        // Redraw header on new page
        doc.setFont("helvetica", "bold");
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 8, "F");
        doc.setTextColor(255, 255, 255);
        headers.forEach((header, i) => {
          doc.text(header, colX[i] + 2, currentY + 5);
        });
        currentY += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(242, 242, 242);
        doc.rect(margin, currentY, pageWidth - 2 * margin, 7, "F");
      }
      
      // Draw row data
      const rowData = [
        (invoice.customerName || invoice.customer || "").substring(0, 25),
        (invoice.profileName || "").substring(0, 20),
        (invoice.frequency || invoice.repeatEvery || "").substring(0, 10),
        formatDateForExport(invoice.lastInvoiceDate).substring(0, 12),
        formatDateForExport(invoice.nextInvoiceDate || invoice.startOn).substring(0, 12),
        (invoice.status || "active").toUpperCase().substring(0, 8),
        formatCurrencyForExport(invoice.total || invoice.amount, invoice.currency).substring(0, 20)
      ];
      
      rowData.forEach((data, i) => {
        doc.text(data, colX[i] + 2, currentY + 5);
      });
      
      // Draw borders
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      
      currentY += 7;
    });
    
    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }
    
    // Save PDF
    doc.save(`recurring-invoices-${new Date().toISOString().split("T")[0]}.pdf`);
  } catch (error: unknown) {
    const err = error as any;
    console.error("Error generating PDF:", err);
    throw new Error(`Failed to generate PDF: ${err?.message ?? String(err)}`);
  }
};

