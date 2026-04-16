import { toast } from "react-toastify";
import { quotesAPI } from "../../../services/api";
import { getQuoteById, getQuotes, saveQuote, updateQuote } from "../../salesModel";
import { formatCurrency, formatDate, getQuoteTotalsMeta, toNumber } from "./QuoteDetail.utils";

export const useQuoteDetailQuoteActions = (ctx: any) => {
  const {
    quote,
    quoteId,
    allQuotes,
    setQuote,
    setAllQuotes,
    setIsDeleteModalOpen,
    setSelectedQuotes,
    setShowMailDropdown,
    setShowMoreDropdown,
    setShowConvertDropdown,
    setIsCloningQuote,
    appendActivityLog,
    getQuoteByIdDep,
    getQuotesDep,
    updateQuoteDep,
    navigate,
    baseCurrency,
    setStatusSuccessMessage,
  } = ctx;

  const handleEdit = async () => {
    const preload = quote
      ? { ...(quote || {}) }
      : await (async () => {
        try {
          return await getQuoteByIdDep(String(quoteId || ""));
        } catch {
          return null;
        }
      })();
    if (preload && typeof window !== "undefined" && quoteId) {
      try {
        localStorage.setItem(`quote_edit_${quoteId}`, JSON.stringify(preload));
      } catch {
        // best effort only
      }
    }
    navigate(`/sales/quotes/${quoteId}/edit`, {
      state: { preloadedQuote: preload, preloadedQuotes: allQuotes },
    });
  };

  const handleConvertToInvoice = () => {
    if (!quote) return;

    try {
      const totalsMeta = getQuoteTotalsMeta(quote);
      const shippingTaxSource =
        (quote as any).shippingChargeTax ??
        (quote as any).shippingTaxId ??
        (quote as any).shippingTax;
      const shippingTaxValue =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? (
            (shippingTaxSource as any)._id ||
            (shippingTaxSource as any).id ||
            (shippingTaxSource as any).taxId ||
            (shippingTaxSource as any).name ||
            (shippingTaxSource as any).taxName ||
            (shippingTaxSource as any).rate ||
            ""
          )
          : (shippingTaxSource ?? "");
      const shippingTaxId =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? String((shippingTaxSource as any)._id || (shippingTaxSource as any).id || (shippingTaxSource as any).taxId || "")
          : String((quote as any).shippingTaxId || "");
      const shippingTaxName =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? String((shippingTaxSource as any).name || (shippingTaxSource as any).taxName || "")
          : String((quote as any).shippingTaxName || "");
      const shippingTaxRate =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? parseFloat((shippingTaxSource as any).rate || 0) || 0
          : parseFloat((quote as any).shippingTaxRate || 0) || 0;

      const invoiceItems = (quote.items || []).map((item: any, index: number) => {
        const quantity = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.unitPrice || item.rate || item.price) || 0;
        const lineAmount = parseFloat(item.total || item.amount || (quantity * rate)) || 0;
        const rawTaxSource = item.tax;
        const rawTaxValue =
          item.taxId ??
          (rawTaxSource && typeof rawTaxSource === "object"
            ? (
              (rawTaxSource as any)._id ||
              (rawTaxSource as any).id ||
              (rawTaxSource as any).taxId ||
              (rawTaxSource as any).name ||
              (rawTaxSource as any).taxName ||
              (rawTaxSource as any).rate ||
              (typeof (rawTaxSource as any).toString === "function" ? (rawTaxSource as any).toString() : "")
            )
            : rawTaxSource) ??
          item.taxName ??
          item.taxLabel ??
          item.taxRate ??
          item.salesTaxRate ??
          "";
        const normalizedRawTaxValue = String(rawTaxValue || "").trim() === "[object Object]" ? "" : rawTaxValue;
        const rawTaxRate = parseFloat(
          item.taxRate ??
          (rawTaxSource && typeof rawTaxSource === "object" ? (rawTaxSource as any).rate : rawTaxSource) ??
          item.salesTaxRate ??
          0
        ) || 0;
        const explicitTaxAmount = parseFloat(item.taxAmount || 0) || 0;
        const derivedTaxRate = rawTaxRate > 0
          ? rawTaxRate
          : (lineAmount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / lineAmount) * 100 : 0);
        const taxIdValue = item.taxId || (
          rawTaxSource && typeof rawTaxSource === "object"
            ? String((rawTaxSource as any)._id || (rawTaxSource as any).id || (rawTaxSource as any).taxId || "")
            : ""
        );

        return {
          id: index + 1,
          itemId: item.item?._id || item.itemId || item.item || null,
          itemDetails: item.name || item.item?.name || "",
          name: item.name || item.item?.name || "",
          quantity,
          rate,
          price: rate,
          tax: taxIdValue || normalizedRawTaxValue || (derivedTaxRate > 0 ? derivedTaxRate : ""),
          taxId: taxIdValue,
          taxRate: derivedTaxRate,
          taxAmount: explicitTaxAmount,
          amount: lineAmount,
          description: item.description || item.name || item.item?.name || "",
        };
      });

      const inferredDiscountType =
        quote.discountType ||
        ((toNumber(quote.discountAmount) > 0 && toNumber(quote.discount) <= 0) ? "amount" : "percent");
      const sourceDiscountType = String(inferredDiscountType || "percent").toLowerCase() === "amount" ? "amount" : "percent";
      const rawDiscount = toNumber(quote.discount ?? quote.discountAmount);
      const discountBase = Math.max(0, toNumber(totalsMeta.discountBase ?? totalsMeta.subTotal));
      const taxAmount = toNumber(totalsMeta.taxAmount);
      const shippingCharges = toNumber(
        quote.shippingCharges ??
        (quote as any).shipping ??
        (quote as any).shippingCharge ??
        totalsMeta.shippingCharges
      );
      const adjustment = toNumber(quote.adjustment);
      const roundOff = toNumber(quote.roundOff);
      const quoteTotal = toNumber(quote.total ?? quote.amount);
      const isTaxInclusive = String(quote.taxExclusive || "Tax Exclusive").toLowerCase().includes("inclusive");

      const totalAssumingPercent =
        discountBase +
        (isTaxInclusive ? 0 : taxAmount) -
        ((discountBase * rawDiscount) / 100) +
        shippingCharges +
        adjustment +
        roundOff;
      const totalAssumingAmount =
        discountBase +
        (isTaxInclusive ? 0 : taxAmount) -
        rawDiscount +
        shippingCharges +
        adjustment +
        roundOff;
      const looksLikeAmount =
        sourceDiscountType === "percent" &&
        rawDiscount > 0 &&
        discountBase > 0 &&
        (
          rawDiscount > 100 ||
          (Math.abs(quoteTotal - totalAssumingAmount) + 0.01 < Math.abs(quoteTotal - totalAssumingPercent))
        );

      const normalizedDiscount = sourceDiscountType === "percent" && looksLikeAmount
        ? (rawDiscount / discountBase) * 100
        : rawDiscount;

      const today = new Date();
      const invoiceDate = today.toISOString().split("T")[0];
      const dueDate = quote.expiryDate ? new Date(quote.expiryDate).toISOString().split("T")[0] :
        new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const quoteData = {
        customerName: quote.customerName || "",
        customerId: quote.customerId || null,
        customerEmail: quote.customerEmail || (quote as any).email || "",
        orderNumber: quote.referenceNumber || "",
        invoiceDate,
        dueDate,
        salesperson: quote.salesperson || "",
        salespersonId: quote.salespersonId || "",
        subject: quote.subject || `Invoice from Quote ${quote.quoteNumber || quote.id}`,
        items: invoiceItems,
        selectedPriceList: (quote as any).priceListName || (quote as any).selectedPriceList || "",
        subTotal: toNumber(totalsMeta.subTotal),
        tax: taxAmount,
        taxAmount,
        totalTax: taxAmount,
        discount: normalizedDiscount,
        discountType: sourceDiscountType,
        discountAccount: quote.discountAccount || "General Income",
        shippingCharges,
        shippingChargeTax: String(shippingTaxValue || ""),
        shippingTaxId,
        shippingTaxName,
        shippingTaxRate,
        shippingTaxAmount: toNumber(totalsMeta.shippingTaxAmount),
        adjustment,
        roundOff,
        total: toNumber(totalsMeta.total),
        currency: quote.currency || "KES",
        customerNotes: quote.customerNotes || "",
        termsAndConditions: quote.termsAndConditions || "",
        taxExclusive: quote.taxExclusive || "Tax Exclusive",
        convertedFromQuote: quoteId,
        quoteNumber: quote.quoteNumber || quote.id,
      };

      const nextStatus = "invoiced";
      try {
        updateQuoteDep(quoteId, { status: nextStatus });
      } catch (error) {
        console.warn("Failed to update quote status after convert:", error);
      }
      setQuote((prev: any) => (prev ? { ...prev, status: nextStatus } : prev));
      setAllQuotes((prev: any[]) =>
        Array.isArray(prev)
          ? prev.map((row: any) => (String(row?._id || row?.id) === String(quoteId) ? { ...row, status: nextStatus } : row))
          : prev
      );

      navigate("/sales/invoices/new", { state: { quoteData } });
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
      toast.error("Failed to convert quote to invoice. Please try again.");
    }
  };

  const handleConvertToDraft = async () => {
    setShowConvertDropdown(false);
    if (!quoteId) return;
    try {
      await updateQuoteDep(quoteId, { status: "draft" });
      await appendActivityLog("Status Updated", "Quote status changed to draft.", "info");
      const updatedQuote = await getQuoteByIdDep(quoteId);
      if (updatedQuote) setQuote(updatedQuote);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      toast.success("Quote converted to draft.");
    } catch (error) {
      console.error("Error converting quote to draft:", error);
      toast.error("Failed to convert quote to draft. Please try again.");
    }
  };

  const handleClose = () => {
    navigate("/sales/quotes");
  };

  const handleCreateProject = () => {
    setShowMoreDropdown(false);
    navigate("/time-tracking/projects/new", {
      state: {
        quoteId,
        customerName: quote.customerName || (typeof quote.customer === "object" ? (quote.customer?.displayName || quote.customer?.name) : quote.customer) || "-",
        customerId: quote?.customerId || null,
      },
    });
  };

  const handleMarkAsAccepted = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;

    try {
      await updateQuoteDep(quoteId, { status: "accepted" });
      await appendActivityLog("Status Updated", "Quote status changed to accepted.", "success");
      const updatedQuote = await getQuoteByIdDep(quoteId);
      if (updatedQuote) setQuote(updatedQuote);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
        toast.success("Quote marked as accepted.");
        setStatusSuccessMessage("Quote status has been changed to accepted.");
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
    } catch (error) {
      console.error("Error marking quote as accepted:", error);
      toast.error("Failed to mark quote as accepted. Please try again.");
    }
  };

  const handleMarkAsDeclined = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;

    try {
      await updateQuoteDep(quoteId, { status: "declined" });
      await appendActivityLog("Status Updated", "Quote status changed to declined.", "warning");
      const updatedQuote = await getQuoteByIdDep(quoteId);
      if (updatedQuote) setQuote(updatedQuote);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
        toast.success("Quote marked as declined.");
        setStatusSuccessMessage("Quote status has been changed to declined.");
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
    } catch (error) {
      console.error("Error marking quote as declined:", error);
      toast.error("Failed to mark quote as declined. Please try again.");
    }
  };

  const handleMarkCurrentAsSent = async () => {
    if (!quoteId) return;
    try {
      await updateQuoteDep(quoteId, { status: "sent" });
      await appendActivityLog("Status Updated", "Quote status changed to sent.", "success");
      const updatedQuote = await getQuoteByIdDep(quoteId);
      if (updatedQuote) setQuote(updatedQuote);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      toast.success("Quote marked as sent.");
    } catch (error) {
      console.error("Error marking quote as sent:", error);
      toast.error("Failed to mark quote as sent. Please try again.");
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quote) return;

    try {
      await updateQuoteDep(quoteId, { status: "approved" });
      await appendActivityLog("Status Updated", "Quote submitted for approval.", "success");
      const updatedQuote = await getQuoteByIdDep(quoteId);
      if (updatedQuote) setQuote(updatedQuote);
      try {
        const quotes = await getQuotesDep();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      toast.success("Quote submitted for approval.");
    } catch (error) {
      console.error("Error submitting quote for approval:", error);
      toast.error("Failed to submit quote for approval. Please try again.");
    }
  };

  const handleDuplicateQuote = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;
    if (ctx.isCloningQuote) return;

    setIsCloningQuote(true);
    try {
      const sourceQuoteNumber = String(quote.quoteNumber || "").trim();
      const prefixMatch = sourceQuoteNumber.match(/^([^\d]*\D-?)/);
      const quotePrefix = (prefixMatch?.[1] || "QT-").trim();

      let nextQuoteNumber = "";
      try {
        const quoteNumberResponse: any = await quotesAPI.getNextNumber(quotePrefix);
        if (quoteNumberResponse?.success && quoteNumberResponse?.data?.quoteNumber) {
          nextQuoteNumber = String(quoteNumberResponse.data.quoteNumber);
        }
      } catch (error) {
        console.error("Error getting next quote number for clone:", error);
      }

      if (!nextQuoteNumber) {
        const existingQuotes = await getQuotes();
        const prefixed = existingQuotes
          .map((q: any) => String(q.quoteNumber || ""))
          .filter((number) => number.startsWith(quotePrefix));
        const maxSuffix = prefixed.reduce((max, number) => {
          const suffix = parseInt(number.replace(quotePrefix, ""), 10);
          return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
        }, 0);
        nextQuoteNumber = `${quotePrefix}${String(maxSuffix + 1).padStart(6, "0")}`;
      }

      const sourceCustomerId = quote.customerId || (typeof quote.customer === "object" ? quote.customer?._id : quote.customer);
      if (!sourceCustomerId) {
        toast.error("Cannot clone quote without a customer.");
        return;
      }

      const copyReference = (() => {
        const base = String(quote.referenceNumber || quote.quoteNumber || "").trim();
        if (!base) return "CLONE";
        if (/clone/i.test(base)) return base;
        if (/copy/i.test(base)) return base.replace(/copy/gi, "CLONE");
        return `${base}-CLONE`;
      })();

      const clonedItems = Array.isArray(quote.items) ? quote.items.map((item: any) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice ?? item.rate ?? item.price ?? 0);
        const lineSubtotal = toNumber(item.total ?? item.amount ?? (quantity * unitPrice));
        return {
          itemId: item.item?._id || item.itemId || item.item || null,
          item: item.item?._id || item.itemId || item.item || null,
          name: item.name || item.item?.name || item.itemDetails || "Item",
          itemDetails: item.itemDetails || item.name || item.item?.name || "Item",
          description: item.description || item.itemDetails || "",
          quantity,
          rate: unitPrice,
          unitPrice,
          tax: item.tax || "",
          taxRate: toNumber(item.taxRate),
          taxAmount: toNumber(item.taxAmount),
          amount: lineSubtotal,
          total: lineSubtotal,
        };
      }) : [];

      const clonedPayload = {
        quoteNumber: nextQuoteNumber,
        referenceNumber: copyReference,
        customer: sourceCustomerId,
        customerId: sourceCustomerId,
        quoteDate: quote.quoteDate || quote.date || new Date().toISOString(),
        expiryDate: quote.expiryDate,
        salesperson: quote.salespersonId || quote.salesperson || "",
        salespersonId: quote.salespersonId || "",
        projectName: quote.projectName || quote.project?.name || "",
        subject: quote.subject || "",
        taxExclusive: quote.taxExclusive || "Tax Exclusive",
        items: clonedItems,
        subtotal: toNumber(quote.subTotal ?? quote.subtotal),
        tax: toNumber(quote.taxAmount ?? quote.tax),
        taxAmount: toNumber(quote.taxAmount ?? quote.tax),
        discount: toNumber(quote.discount),
        discountType: quote.discountType || "percent",
        discountAmount: toNumber(quote.discount),
        discountAccount: quote.discountAccount || "General Income",
        shippingCharges: toNumber(quote.shippingCharges),
        adjustment: toNumber(quote.adjustment),
        roundOff: toNumber(quote.roundOff),
        total: toNumber(quote.total),
        currency: quote.currency || baseCurrency,
        customerNotes: quote.customerNotes || quote.notes || "",
        termsAndConditions: quote.termsAndConditions || quote.terms || "",
        attachedFiles: Array.isArray(quote.attachedFiles)
          ? quote.attachedFiles.map((file: any) => ({
            id: file.id || file.documentId || file._id,
            name: file.name,
            size: toNumber(file.size),
            url: file.url,
            mimeType: file.mimeType || file.type || "",
            documentId: file.documentId || file.id || file._id,
            uploadedAt: file.uploadedAt || file.createdAt || new Date().toISOString(),
          }))
          : [],
        comments: Array.isArray(quote.comments)
          ? quote.comments
            .filter((comment: any) => comment && String(comment.text || "").trim())
            .map((comment: any) => ({
              text: String(comment.text || "").trim(),
              author: comment.author || "User",
              bold: Boolean(comment.bold),
              italic: Boolean(comment.italic),
              underline: Boolean(comment.underline),
              timestamp: comment.timestamp || comment.createdAt || new Date().toISOString(),
            }))
          : [],
        status: "draft",
      };

      const duplicatedQuote: any = await saveQuote(clonedPayload);
      const duplicatedQuoteId = duplicatedQuote?._id || duplicatedQuote?.id;
      if (!duplicatedQuoteId) {
        throw new Error("Cloned quote was saved but no ID was returned.");
      }

      await appendActivityLog("Clone Quote", `Quote was duplicated as ${nextQuoteNumber}.`, "success");
      toast.success(`Quote duplicated as ${nextQuoteNumber}`);
      navigate(`/sales/quotes/${duplicatedQuoteId}`);
    } catch (error) {
      console.error("Error duplicating quote:", error);
      toast.error("Failed to duplicate quote. Please try again.");
    } finally {
      setIsCloningQuote(false);
    }
  };

  const handleDeleteQuote = () => {
    setShowMoreDropdown(false);
    if (!quote) return;
    setSelectedQuotes([quoteId]);
    setIsDeleteModalOpen(true);
  };

  const handleCopyQuoteLink = () => {
    setShowMoreDropdown(false);
    const quoteUrl = window.location.href;
    navigator.clipboard.writeText(quoteUrl).then(() => {
      toast.success("Quote link copied to clipboard.");
    }).catch(() => {
      toast.error("Unable to copy link. Please copy manually.");
    });
  };

  const handleQuotePreferences = () => {
    setShowMoreDropdown(false);
    toast("Quote Preferences feature coming soon.");
  };

  const handleManageCustomFields = () => {
    setShowMoreDropdown(false);
    navigate("/settings/quotes/customfields");
  };

  return {
    handleEdit,
    handleConvertToInvoice,
    handleConvertToDraft,
    handleClose,
    handleCreateProject,
    handleMarkAsAccepted,
    handleMarkAsDeclined,
    handleMarkCurrentAsSent,
    handleSubmitForApproval,
    handleDuplicateQuote,
    handleDeleteQuote,
    handleCopyQuoteLink,
    handleQuotePreferences,
    handleManageCustomFields,
  };
};
