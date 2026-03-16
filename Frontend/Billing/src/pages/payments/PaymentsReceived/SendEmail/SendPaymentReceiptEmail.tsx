import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getPaymentById, updatePayment } from "../../../sales/salesModel";
import { settingsAPI, paymentsReceivedAPI } from "../../../../services/api";
import { useCurrency } from "../../../../hooks/useCurrency";
import { X, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon, Paperclip } from "lucide-react";
import { API_BASE_URL, getToken } from "../../../../services/auth";

const parseNumericAmount = (value: number | string | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateForDisplay = (dateInput: string) => {
  if (!dateInput) return "";
  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) return dateInput;
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = parsedDate.toLocaleString("en-US", { month: "short" });
  const year = parsedDate.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function SendPaymentReceiptEmail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const bodyEditorRef = useRef<HTMLDivElement | null>(null);
  const { baseCurrency, symbol } = useCurrency();

  const [paymentData, setPaymentData] = useState<any>(location.state?.paymentData || {});
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isBodyInitialized, setIsBodyInitialized] = useState(false);

  const paymentId = useMemo(
    () => String(id || paymentData?.id || paymentData?._id || ""),
    [id, paymentData]
  );

  const senderName = paymentData?.senderName || paymentData?.organizationName || "System";
  const senderEmail = paymentData?.senderEmail || "nasram172@gmail.com";
  const customerName = paymentData?.customerName || paymentData?.customer?.displayName || paymentData?.customer?.name || "Customer";

  const formatCurrency = (amount: number | string, currencyCode?: string) => {
    const resolvedCode = String(currencyCode || paymentData?.currency || baseCurrency || "USD").toUpperCase();
    return `${resolvedCode} ${parseNumericAmount(amount).toFixed(2)}`;
  };

  const generateEmailBody = (payment: any) => {
    const paymentNumber = payment?.paymentNumber || payment?.id || "PAY-00001";
    const paymentDate = formatDateForDisplay(payment?.paymentDate || payment?.date || "");
    const amount = formatCurrency(payment?.amountReceived || payment?.amount || 0);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333;">
        <p style="font-size: 14px; margin-bottom: 20px;">Dear ${customerName},</p>
        <p style="font-size: 14px; margin-bottom: 20px;">Thank you for your payment. It was a pleasure doing business with you. We look forward to work together again!</p>

        <div style="background-color: #FFFEF0; border: 1px solid #E8E5D0; border-radius: 4px; padding: 30px; text-align: center; margin: 30px 0;">
          <h3 style="margin:0 0 10px 0;">Payment Received</h3>
          <div style="color: #22C55E; font-size: 28px; font-weight: bold; margin-bottom: 18px;">${amount}</div>
          <hr style="border-color: #E8E5D0; margin: 18px 0;" />
          <table style="width:100%; max-width:480px; margin: 0 auto;">
            <tr>
              <td style="text-align:left; padding:8px; color:#333;">Payment No</td>
              <td style="text-align:right; padding:8px; font-weight:600;">${paymentNumber}</td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; color:#333;">Payment Date</td>
              <td style="text-align:right; padding:8px; font-weight:600;">${paymentDate || "-"}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; margin: 0;">Regards,</p>
        <p style="font-size: 14px; margin: 5px 0 0 0; font-weight: bold;">${payment?.organizationName || "Taban Enterprise"}</p>
      </div>
    `;
  };

  const [emailData, setEmailData] = useState({
    from: `${senderName} <${senderEmail}>`,
    to: paymentData?.customerEmail || paymentData?.contactEmail || paymentData?.customer?.email || "",
    cc: "",
    bcc: "",
    subject: `Payment Received - ${paymentData?.paymentNumber || ""}`,
    body: "",
    attachPDF: false
  });

  useEffect(() => {
    let cancelled = false;

    const loadPayment = async () => {
      if (!paymentId) return;
      try {
        const latestPayment = await getPaymentById(paymentId);
        if (!cancelled && latestPayment) {
          setPaymentData((prev: any) => ({ ...(prev || {}), ...latestPayment }));
        }
      } catch (error) {
        console.error("Failed to load latest payment for email:", error);
      }
    };

    loadPayment();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  useEffect(() => {
    if (!isBodyInitialized) {
      setEmailData((prev) => ({
        ...prev,
        from: `${senderName} <${senderEmail}>`,
        to: prev.to || paymentData?.customerEmail || paymentData?.contactEmail || paymentData?.customer?.email || "",
        subject: prev.subject || `Payment Received - ${paymentData?.paymentNumber || ""}`,
        body: generateEmailBody(paymentData)
      }));
      setIsBodyInitialized(true);
      return;
    }

    setEmailData((prev) => ({
      ...prev,
      from: `${senderName} <${senderEmail}>`,
      to: prev.to || paymentData?.customerEmail || paymentData?.contactEmail || paymentData?.customer?.email || "",
      subject: prev.subject || `Payment Received - ${paymentData?.paymentNumber || ""}`
    }));
  }, [paymentData, senderName, senderEmail, isBodyInitialized]);

  useEffect(() => {
    const loadGeneralSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/settings/general`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (!response.ok) return;
        const json = await response.json();
        const attachByDefault = json?.data?.settings?.pdfSettings?.attachPaymentReceipt ?? false;
        setEmailData((prev) => ({ ...prev, attachPDF: Boolean(attachByDefault) }));
      } catch (error) {
        console.error("Error loading general settings for payment email:", error);
      }
    };
    loadGeneralSettings();
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to convert PDF blob to base64"));
      reader.readAsDataURL(blob);
    });

  const formatCurrencyForPdf = (amount: number | string, currencyCode?: string) => {
    const code = String(currencyCode || paymentData?.currency || baseCurrency || "USD").split(/\s|-|_/)[0] || "USD";
    return `${code.toUpperCase()} ${parseNumericAmount(amount).toFixed(2)}`;
  };

  const getPaymentReceiptPdfTemplate = (payment: any, organizationData: any, logoPreview: string) => {
    const allocations = Array.isArray(payment?.allocations) ? payment.allocations : [];
    const allocationRows = allocations.length > 0
      ? allocations.map((alloc: any) => `
          <tr>
            <td>${alloc?.invoice?.invoiceNumber || alloc?.invoice?.id || alloc?.invoice || "-"}</td>
            <td>${formatDateForDisplay(alloc?.invoice?.date || payment?.paymentDate || payment?.date || "")}</td>
            <td>${formatCurrencyForPdf(alloc?.invoice?.total || alloc?.amount || 0, payment?.currency)}</td>
            <td>${formatCurrencyForPdf(alloc?.amount || 0, payment?.currency)}</td>
          </tr>
        `).join("")
      : (payment?.invoiceNumber || payment?.invoiceAmount || payment?.invoiceDate)
        ? `
          <tr>
            <td>${payment?.invoiceNumber || "-"}</td>
            <td>${formatDateForDisplay(payment?.invoiceDate || payment?.paymentDate || payment?.date || "")}</td>
            <td>${formatCurrencyForPdf(payment?.invoiceAmount || payment?.amountReceived || 0, payment?.currency)}</td>
            <td>${formatCurrencyForPdf(payment?.amountReceived || 0, payment?.currency)}</td>
          </tr>
        `
        : `
          <tr>
            <td colspan="4" style="text-align:center; color:#6b7280;">No invoices linked</td>
          </tr>
        `;

    const statusLabel = String(payment?.status || "paid").toUpperCase();
    const companyName = organizationData?.name || "TABAN ENTERPRISES";

    return `
      <div style="font-family: Arial, sans-serif; width:794px; min-height:1123px; background:#ffffff; color:#111827; padding:28px;">
        <div style="position: relative; border:1px solid #e5e7eb; min-height:1000px; padding:38px 56px;">
          <div style="position:absolute; top:0; left:0; width:0; height:0; border-top:80px solid #22c55e; border-right:80px solid transparent;"></div>
          <div style="position:absolute; top:12px; left:10px; color:#ffffff; font-size:16px; font-weight:700; transform:rotate(-45deg); transform-origin: 0 0;">${statusLabel}</div>

          <div style="margin-top:12px;">
            ${logoPreview ? `<img src="${logoPreview}" alt="Logo" style="height:70px; object-fit:contain; margin-bottom:16px;" />` : ""}
            <div style="font-size:34px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:10px;">${companyName}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.street1 || ""}${organizationData?.street2 ? `, ${organizationData.street2}` : ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.city || ""}${organizationData?.zipCode ? ` ${organizationData.zipCode}` : ""}${organizationData?.stateProvince ? `, ${organizationData.stateProvince}` : ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.country || ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.email || ""}</div>
          </div>

          <div style="text-align:center; margin-top:46px; margin-bottom:40px;">
            <div style="font-size:42px; font-weight:700; letter-spacing:0.22em;">PAYMENT RECEIPT</div>
            <div style="height:1px; background:#d1d5db; width:260px; margin:10px auto 0;"></div>
          </div>

          <div style="display:flex; align-items:flex-start; gap:34px; margin-bottom:26px;">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Payment Date</span>
                <span style="font-weight:600;">${formatDateForDisplay(payment?.paymentDate || payment?.date || "") || "-"}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Reference Number</span>
                <span style="font-weight:600;">${payment?.referenceNumber || "-"}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Payment Mode</span>
                <span style="font-weight:600;">${payment?.paymentMode || "-"}</span>
              </div>
            </div>
            <div style="width:250px; background:#7cb342; color:#ffffff; border-radius:3px; text-align:center; padding:22px 14px;">
              <div style="font-size:24px; margin-bottom:8px;">Amount Received</div>
              <div style="font-size:46px; font-weight:700;">${formatCurrencyForPdf(payment?.amountReceived || payment?.amount || 0, payment?.currency)}</div>
            </div>
          </div>

          <div style="margin-top:36px; margin-bottom:18px;">
            <div style="font-size:22px; color:#4b5563; margin-bottom:8px;">Received From</div>
            <div style="font-size:30px; color:#2563eb; font-weight:700;">${payment?.customerName || "-"}</div>
          </div>

          <div style="margin-top:44px;">
            <div style="font-size:26px; font-weight:700; margin-bottom:12px;">Payment for</div>
            <table style="width:100%; border-collapse:collapse; font-size:20px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE NUMBER</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE DATE</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE AMOUNT</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">PAYMENT AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${allocationRows}
              </tbody>
            </table>
          </div>

          <div style="margin-top:22px; text-align:center; color:#9ca3af; font-size:18px;">PDF Template: 'Elite Template'</div>
        </div>
      </div>
    `;
  };

  const buildPaymentPdfAttachment = async (payment: any) => {
    const organizationDefaults = {
      name: "TABAN ENTERPRISES",
      street1: "",
      street2: "",
      city: "",
      stateProvince: "",
      country: "",
      zipCode: "",
      email: ""
    };
    let organizationData = organizationDefaults;
    let logoPreview = "";

    try {
      const orgResponse = await settingsAPI.getOrganizationProfile();
      if (orgResponse?.success && orgResponse?.data) {
        const org = orgResponse.data;
        organizationData = {
          ...organizationDefaults,
          name: org.name || organizationDefaults.name,
          street1: org.address?.street1 || "",
          street2: org.address?.street2 || "",
          city: org.address?.city || "",
          stateProvince: org.address?.state || "",
          country: org.address?.country || "",
          zipCode: org.address?.zipCode || "",
          email: org.email || ""
        };
        logoPreview = org.logo || "";
      }
    } catch (error) {
      console.warn("Could not load organization profile for payment PDF attachment.", error);
    }

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.width = "794px";
    wrapper.style.background = "#ffffff";
    wrapper.style.zIndex = "-1";
    wrapper.innerHTML = getPaymentReceiptPdfTemplate(payment, organizationData, logoPreview);
    document.body.appendChild(wrapper);

    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - (margin * 2);
      const printableHeight = pageHeight - (margin * 2);
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      const pdfBlob = pdf.output("blob");
      const base64 = await blobToBase64(pdfBlob);
      return {
        filename: `${payment?.paymentNumber || payment?.id || "payment-receipt"}.pdf`,
        content: base64,
        contentType: "application/pdf",
        encoding: "base64"
      };
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const handleSend = async () => {
    if (!String(emailData.to || "").trim()) {
      alert("Recipient email is missing. Please add a recipient.");
      return;
    }
    if (!paymentId) {
      alert("Payment ID is missing.");
      return;
    }

    setIsSending(true);
    try {
      let latestPayment = paymentData;
      try {
        const fetchedPayment = await getPaymentById(paymentId);
        if (fetchedPayment) {
          latestPayment = { ...(paymentData || {}), ...fetchedPayment };
          setPaymentData(latestPayment);
        }
      } catch (error) {
        console.warn("Could not refresh payment details before sending email.", error);
      }

      const outgoingAttachments: any[] = [];
      let attachSystemPdfFallback = false;
      if (emailData.attachPDF) {
        try {
          const generatedPdf = await buildPaymentPdfAttachment(latestPayment);
          if (generatedPdf) {
            outgoingAttachments.push(generatedPdf);
          } else {
            attachSystemPdfFallback = true;
          }
        } catch (pdfError) {
          console.error("Error generating payment receipt PDF attachment. Falling back to system PDF.", pdfError);
          attachSystemPdfFallback = true;
        }
      }

      const latestBody = bodyEditorRef.current?.innerHTML || emailData.body;
      const payload = {
        from: emailData.from,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        body: latestBody,
        attachPDF: emailData.attachPDF,
        attachSystemPDF: emailData.attachPDF ? attachSystemPdfFallback : false,
        attachments: outgoingAttachments,
        paymentId
      };

      await paymentsReceivedAPI.sendEmail(paymentId, payload);

      try {
        await updatePayment(paymentId, { emailed: true });
      } catch (statusError) {
        console.warn("Failed to update payment status after sending email.", statusError);
      }

      alert("Email sent successfully!");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Failed to send email. Please check your SMTP settings or try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Email To {customerName}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24 flex items-center gap-1">From <span className="text-blue-500 cursor-help">i</span></label>
            <div className="flex-1">
              <input type="text" value={emailData.from} readOnly className="w-full px-3 py-2 text-sm text-gray-900" />
            </div>
          </div>

          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24">Send To</label>
            <div className="flex-1 flex items-center gap-2">
              <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {(customerName || "C").charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-sm">{customerName}</div>
                  <div className="text-xs text-gray-500">{emailData.to}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => setShowCc(!showCc)} className="text-blue-600">Cc</button>
              <button onClick={() => setShowBcc(!showBcc)} className="text-blue-600">Bcc</button>
            </div>
          </div>

          {showCc && (
            <div className="border-b border-gray-200 px-6 py-4 flex items-center">
              <label className="text-sm text-gray-600 w-24">Cc</label>
              <input
                type="text"
                value={emailData.cc}
                onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                className="flex-1 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          )}

          {showBcc && (
            <div className="border-b border-gray-200 px-6 py-4 flex items-center">
              <label className="text-sm text-gray-600 w-24">Bcc</label>
              <input
                type="text"
                value={emailData.bcc}
                onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                className="flex-1 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          )}

          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="flex-1 px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded" title="Bold"><Bold size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Italic"><Italic size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Underline"><Underline size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Strikethrough"><Strikethrough size={16} className="text-gray-600" /></button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <select className="px-2 py-1 text-sm border border-gray-300 rounded">
              <option>16 px</option>
              <option>14 px</option>
              <option>12 px</option>
            </select>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert Link"><LinkIcon size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert Image"><ImageIcon size={16} className="text-gray-600" /></button>
          </div>

          <div className="px-6 py-4">
            <div
              ref={bodyEditorRef}
              className="min-h-[300px] max-h-[600px] overflow-y-auto text-sm text-gray-900"
              contentEditable
              dangerouslySetInnerHTML={{ __html: emailData.body }}
              onBlur={(e) => setEmailData({ ...emailData, body: e.currentTarget.innerHTML })}
            />
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailData.attachPDF}
                onChange={(e) => setEmailData({ ...emailData, attachPDF: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-gray-700">Attach Payment Receipt PDF</span>
            </label>

            {emailData.attachPDF && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                </div>
                <span className="text-sm text-gray-700 font-medium">{paymentData?.paymentNumber || paymentData?.id || "Payment Receipt"}.pdf</span>
              </div>
            )}

            <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Paperclip size={14} />
              Attachments
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={isSending}
            className={`px-6 py-2 text-white text-sm font-medium rounded-lg ${isSending ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600"}`}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSending}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
