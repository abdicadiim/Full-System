import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";
import { formatCurrency, formatDate, generateQuoteHTMLForQuote } from "./QuoteDetail.utils";

export const useQuoteDetailCommunicationActions = (ctx: any) => {
  const {
    quote,
    quoteId,
    showMailDropdown,
    setShowMailDropdown,
    showPdfDropdown,
    setShowPdfDropdown,
    showShareModal,
    setShowShareModal,
    setShowEmailModal,
    linkExpirationDate,
    setLinkExpirationDate,
    generatedLink,
    setGeneratedLink,
    isLinkGenerated,
    setIsLinkGenerated,
    shareVisibility,
    setShareVisibility,
    isVisibilityDropdownOpen,
    setIsVisibilityDropdownOpen,
    emailData,
    setEmailData,
    organizationProfile,
    ownerEmail,
    appendActivityLog,
    navigate,
    organizationNameHtml,
  } = ctx;

  const handleSendEmail = () => {
    setShowMailDropdown(false);
    if (!quote) return;
    navigate(`/sales/quotes/${quoteId}/email`, {
      state: {
        preloadedQuote: quote,
        customerEmail: String(quote.customerEmail || quote.customer?.email || quote.customer?.primaryEmail || "").trim(),
      },
    });
  };

  const handleViewQuoteInNewPage = () => {
    setShowPdfDropdown(false);
    if (!quote) return;

    const html = generateQuoteHTMLForQuote(quote, organizationProfile, ownerEmail);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleSendReminder = () => {
    setShowMailDropdown(false);
    const orgName = organizationProfile?.name || "Your Company";
    const subject = encodeURIComponent(`Reminder: Quote ${quote.quoteNumber || quote.id} from ${orgName}`);
    const body = encodeURIComponent(`Dear ${quote.customerName || "Customer"},\n\nThis is a friendly reminder about quote ${quote.quoteNumber || quote.id} that was sent to you.\n\nQuote Details:\n- Quote Number: ${quote.quoteNumber || quote.id}\n- Amount: ${formatCurrency(quote.total, quote.currency)}\n- Valid Until: ${formatDate(quote.expiryDate)}\n\nPlease review and let us know your decision.\n\nBest regards,\n${orgName}`);
    const mailtoLink = `mailto:${quote.customerEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, "_blank");
  };

  const handleViewEmailHistory = () => {
    setShowMailDropdown(false);
    toast("Email history feature coming soon.");
  };

  const handleShare = () => {
    if (!quote) return;
    let defaultExpiryDate: Date;
    if (quote.expiryDate) {
      defaultExpiryDate = new Date(quote.expiryDate);
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    } else {
      defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    }

    const day = String(defaultExpiryDate.getDate()).padStart(2, "0");
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, "0");
    const year = defaultExpiryDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setLinkExpirationDate(formattedDate);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShowShareModal(true);
  };

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      toast.error("Please select an expiration date.");
      return;
    }

    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const quoteIdValue = quote.id || quote.quoteNumber || Date.now();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const secureLink = `${baseUrl}?CEstimateID=${quoteIdValue}-${token}`;
    setGeneratedLink(secureLink);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        toast.success("Link copied to clipboard.");
      }).catch(() => {
        toast.error("Unable to copy link. Please copy manually.");
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this quote?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      toast.success("All active links have been disabled.");
    }
  };

  const handlePrintQuote = () => {
    setShowPdfDropdown(false);
    if (!quote) return;
    window.print();
  };

  const handleDownloadPDF = async () => {
    setShowPdfDropdown(false);
    if (!quote) return;

    try {
      const sourceElement = document.querySelector("[data-print-content]") as HTMLElement | null;
      if (!sourceElement) {
        throw new Error("Quote preview element not found.");
      }

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = "794px";
      wrapper.style.background = "#ffffff";
      wrapper.style.padding = "0";
      wrapper.style.margin = "0";
      wrapper.style.overflow = "visible";

      const cloned = sourceElement.cloneNode(true) as HTMLElement;
      cloned.style.width = "794px";
      cloned.style.maxWidth = "794px";
      cloned.style.margin = "0";
      cloned.style.boxShadow = "none";
      cloned.style.background = "#ffffff";
      wrapper.appendChild(cloned);
      document.body.appendChild(wrapper);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(wrapper, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        allowTaint: true,
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "JPEG", margin, position, printableWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, printableWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`Quote-${quote.quoteNumber || quote.id}.pdf`);
      toast.success("Quote PDF downloaded.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to download quote PDF.");
    }
  };

  return {
    handleSendEmail,
    handleViewQuoteInNewPage,
    handleSendReminder,
    handleViewEmailHistory,
    handleShare,
    handleGenerateLink,
    handleCopyLink,
    handleDisableAllActiveLinks,
    handlePrintQuote,
    handleDownloadPDF,
  };
};

