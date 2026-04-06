import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";
import { deleteQuotes } from "../../salesModel";
import { formatCurrency, formatDate, generateQuoteHTMLForQuote, getQuoteTotalsMeta } from "./QuoteDetail.utils";

export const useQuoteDetailBulkActions = (ctx: any) => {
  const {
    quote,
    quoteId,
    allQuotes,
    selectedQuotes,
    setQuote,
    setAllQuotes,
    setSelectedQuotes,
    setIsBulkActionsOpen,
    setIsBulkUpdateModalOpen,
    setIsMarkAsSentModalOpen,
    setIsDeleteModalOpen,
    bulkUpdateField,
    setBulkUpdateField,
    bulkUpdateValue,
    setBulkUpdateValue,
    bulkFieldSearch,
    setBulkFieldSearch,
    appendActivityLog,
    getQuoteByIdDep,
    getQuotesDep,
    updateQuoteDep,
    navigate,
    organizationNameHtml,
  } = ctx;

  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleExportPDF = async () => {
    setIsBulkActionsOpen(false);
    const selectedQuoteData = allQuotes.filter((q: any) => selectedQuotes.includes(q.id));

    if (selectedQuoteData.length === 0) {
      toast.error("Please select at least one quote to export.");
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < selectedQuoteData.length; i++) {
        const itemQuote = selectedQuoteData[i];
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = generateQuoteHTMLForQuote(itemQuote, ctx.organizationProfile, ctx.ownerEmail);
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        tempDiv.style.width = "210mm";
        document.body.appendChild(tempDiv);

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const canvas = await html2canvas(tempDiv, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          width: 794,
          windowWidth: 794,
        });

        document.body.removeChild(tempDiv);

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.97);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      }

      pdf.save(`Quotes-Export-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating bulk PDF:", error);
      const printWindow = window.open("", "_blank");
      printWindow?.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotes Export</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #333; }
            .quote-export { page-break-after: always; margin-bottom: 40px; }
            .quote-export:last-child { page-break-after: auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
            .quote-title { font-size: 24px; color: #111; margin: 20px 0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 10px; }
            .status-draft { background: #fef3c7; color: #92400e; }
            .status-sent { background: #dbeafe; color: #1e40af; }
            .status-accepted { background: #d1fae5; color: #065f46; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
            .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-size: 14px; color: #111; font-weight: 500; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: 600; color: #374151; }
            .total-row { font-weight: bold; background: #f9fafb; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          ${selectedQuoteData.map((q: any) => `
            <div class="quote-export">
              <div class="header">
                <h1>${organizationNameHtml}</h1>
                <p>Quote Document</p>
              </div>
              <h2 class="quote-title">
                ${q.quoteNumber || q.id}
                <span class="status-badge status-${(q.status || "draft").toLowerCase()}">${(q.status || "Draft").toUpperCase()}</span>
              </h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Customer</div>
                  <div class="info-value">${q.customerName || "N/A"}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Quote Date</div>
                  <div class="info-value">${formatDate(q.quoteDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Expiry Date</div>
                  <div class="info-value">${formatDate(q.expiryDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Salesperson</div>
                  <div class="info-value">${q.salesperson || "N/A"}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${q.items && q.items.length > 0 ? q.items.map((item: any) => `
                    <tr>
                      <td>${item.name || item.item?.name || "N/A"}</td>
                      <td>${item.quantity || 0}</td>
                      <td>${formatCurrency(item.unitPrice || item.rate || item.price, q.currency)}</td>
                      <td>${formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price)), q.currency)}</td>
                    </tr>
                  `).join("") : '<tr><td colspan="4">No items</td></tr>'}
                  <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>${formatCurrency(q.total, q.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `).join("")}
          <div class="footer">
            Generated by ${organizationNameHtml} on ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `);
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
    }
  };

  const handleBulkPrint = () => {
    setIsBulkActionsOpen(false);
    void handleExportPDF();
  };

  const handleBulkMarkAsSent = () => {
    setIsMarkAsSentModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleConfirmMarkAsSent = async () => {
    try {
      await Promise.all(selectedQuotes.map((id: any) => updateQuoteDep(id, { status: "sent" })));
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      if (quoteId) {
        try {
          const quoteData = await getQuoteByIdDep(quoteId);
          if (quoteData) {
            setQuote(quoteData);
          }
        } catch (error) {
          console.error("Error reloading quote data:", error);
        }
      }
      toast.success(`${selectedQuotes.length} quote(s) marked as sent.`);
      await appendActivityLog("Bulk Mark As Sent", `${selectedQuotes.length} quote(s) were marked as sent.`, "success");
    } catch (error) {
      console.error("Error marking quotes as sent:", error);
      toast.error("Failed to mark selected quotes as sent.");
    }
    setSelectedQuotes([]);
    setIsMarkAsSentModalOpen(false);
  };

  const handleBulkDelete = () => {
    setIsDeleteModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteQuotes(selectedQuotes);
      toast.success(`${selectedQuotes.length} quote(s) deleted.`);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
        if (selectedQuotes.includes(quoteId)) {
          const remainingQuotes = quotes.filter((q: any) => !selectedQuotes.includes(q.id));
          if (remainingQuotes.length > 0) {
            navigate(`/sales/quotes/${remainingQuotes[0].id}`);
          } else {
            navigate("/sales/quotes");
          }
        }
      } catch (error) {
        console.error("Error reloading quotes:", error);
        if (selectedQuotes.includes(quoteId)) {
          navigate("/sales/quotes");
        }
      }

      if (!selectedQuotes.includes(quoteId)) {
        await appendActivityLog("Bulk Delete", `${selectedQuotes.length} quote(s) were deleted.`, "warning");
      }
    } catch (error) {
      console.error("Error deleting quotes:", error);
      toast.error("Failed to delete selected quotes.");
    }

    setSelectedQuotes([]);
    setIsDeleteModalOpen(false);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !bulkUpdateValue) return;

    try {
      await Promise.all(selectedQuotes.map((id: any) => {
        const updateData: any = {};
        updateData[bulkUpdateField] = bulkUpdateValue;
        return updateQuoteDep(id, updateData);
      }));

      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      if (quoteId) {
        try {
          const quoteData = await getQuoteByIdDep(quoteId);
          if (quoteData) {
            setQuote(quoteData);
          }
        } catch (error) {
          console.error("Error reloading quote data:", error);
        }
      }
      toast.success("Bulk update completed.");
      await appendActivityLog("Bulk Update", `Updated ${selectedQuotes.length} quote(s): ${bulkUpdateField}.`, "success");
    } catch (error) {
      console.error("Error bulk updating quotes:", error);
      toast.error("Failed to bulk update selected quotes.");
    }

    setSelectedQuotes([]);
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const bulkUpdateFields = [
    { value: "paymentTerms", label: "Payment Terms" },
    { value: "billingAddress", label: "Billing Address" },
    { value: "shippingAddress", label: "Shipping Address" },
    { value: "billingAndShippingAddress", label: "Billing and Shipping Address" },
    { value: "pdfTemplate", label: "PDF Template" },
    { value: "referenceNumber", label: "Reference#" },
    { value: "quoteDate", label: "Quote Date" },
    { value: "expiryDate", label: "Expiry Date" },
    { value: "customerNotes", label: "Customer Notes" },
    { value: "termsAndConditions", label: "Terms & Conditions" },
  ];

  const filteredBulkFields = bulkUpdateFields.filter((field) =>
    field.label.toLowerCase().includes(bulkFieldSearch.toLowerCase())
  );

  return {
    handleBulkUpdate,
    handleExportPDF,
    handleBulkPrint,
    handleBulkMarkAsSent,
    handleConfirmMarkAsSent,
    handleBulkDelete,
    handleConfirmDelete,
    handleBulkUpdateSubmit,
    bulkUpdateFields,
    filteredBulkFields,
  };
};

