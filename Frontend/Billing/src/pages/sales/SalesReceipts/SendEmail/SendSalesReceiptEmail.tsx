// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getSalesReceiptById } from "../../salesModel";
import { salesReceiptsAPI } from "../../../../services/api";
import { X, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon, Paperclip, Loader2 } from "lucide-react";

const formatDisplayDate = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const parseAmount = (value: any) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildSalesReceiptEmailTemplate = (receipt: any) => {
  const receiptNumber = receipt?.receiptNumber || receipt?.id || "SR-00001";
  const receiptDate = formatDisplayDate(receipt?.receiptDate || receipt?.date || new Date());
  const currency = String(receipt?.currency || "USD").toUpperCase();
  const amountPaid = `${currency}${parseAmount(receipt?.total ?? receipt?.amount ?? 0).toFixed(2)}`;
  const customerName = receipt?.customerName || receipt?.customer?.displayName || receipt?.customer?.name || "Customer";
  const note = String(receipt?.notes || "").trim() || "Thank you for shopping with us.";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; background-color: #f8fafc; padding: 24px 0;">
      <div style="background-color: #187bff; color: #fff; text-align: center; padding: 14px 0; font-size: 18px; font-weight: 600;">
        SalesReceipt# ${receiptNumber}
      </div>
      <div style="background-color: #ffffff; border: 1px solid #dee2e6; margin: 0 24px; border-radius: 6px; padding: 24px;">
        <p style="font-size: 15px; margin: 0 0 8px 0;">Dear ${customerName},</p>
        <p style="font-size: 15px; margin: 0 0 20px 0;">${note}</p>

        <div style="background-color: #fff9e5; border-radius: 6px; border: 1px solid #f0e4b8; padding: 20px; text-align: center;">
          <div style="font-size: 16px; font-weight: 600; color: #1f2937;">Amount Paid</div>
          <div style="font-size: 32px; font-weight: 700; color: #16a34a; margin: 8px 0;">${amountPaid}</div>
          <hr style="border: none; border-top: 1px solid #f0e4b8; margin: 12px 0;">
          <table style="width: 100%; margin-top: 12px; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #374151; font-weight: 600;">Receipt Number</td>
              <td style="padding: 4px 0; color: #111827; text-align: right;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #374151; font-weight: 600;">Receipt Date</td>
              <td style="padding: 4px 0; color: #111827; text-align: right;">${receiptDate}</td>
            </tr>
          </table>
          <div style="border-top: 1px solid #f0e4b8; margin: 12px 0;"></div>
          <div style="font-size: 14px; color: #374151;">
            Note: <span style="font-weight: 600; color: #111827;">${note}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

export default function SendSalesReceiptEmail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const stateReceiptData = location.state?.receiptData || null;
  const [receiptData, setReceiptData] = useState(stateReceiptData || {});
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadReceiptData = async () => {
      if (stateReceiptData && Object.keys(stateReceiptData).length > 0) {
        setReceiptData(stateReceiptData);
        return;
      }
      if (!id) return;

      try {
        const data = await getSalesReceiptById(id);
        if (!cancelled && data) {
          setReceiptData(data);
        }
      } catch (error) {
        console.error("Failed to load sales receipt for email:", error);
      }
    };

    loadReceiptData();
    return () => {
      cancelled = true;
    };
  }, [id, stateReceiptData]);

  const defaultEmailBody = useMemo(() => buildSalesReceiptEmailTemplate(receiptData), [receiptData]);

  const [emailData, setEmailData] = useState({
    from: "System <maxamuudm189@gmail.com>",
    to: "",
    cc: "",
    bcc: "",
    subject: "Receipt for your recent purchase from Taban Enterprise",
    body: defaultEmailBody,
    attachPDF: true
  });

  useEffect(() => {
    const senderEmail = receiptData?.senderEmail || "maxamuudm189@gmail.com";
    const customerEmail = receiptData?.customerEmail || receiptData?.customer?.email || "";
    setEmailData((prev) => ({
      ...prev,
      from: `System <${senderEmail}>`,
      to: prev.to || customerEmail,
      subject: prev.subject || "Receipt for your recent purchase from Taban Enterprise",
      body: defaultEmailBody
    }));
  }, [receiptData, defaultEmailBody]);

  const splitEmailList = (value: string) =>
    String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const handleSend = async () => {
    if (!id) {
      alert("Sales receipt ID is missing.");
      return;
    }
    if (!String(emailData.to || "").trim()) {
      alert("Please enter recipient email.");
      return;
    }

    try {
      setIsSending(true);

      const latestBody = editorRef.current?.innerHTML || emailData.body;

      await salesReceiptsAPI.sendEmail(id, {
        to: emailData.to,
        cc: splitEmailList(emailData.cc),
        bcc: splitEmailList(emailData.bcc),
        from: emailData.from,
        subject: emailData.subject,
        body: latestBody,
        attachSystemPDF: emailData.attachPDF
      });

      alert("Email sent successfully.");
      navigate(`/sales/sales-receipts/${id}`);
    } catch (error) {
      console.error("Error sending sales receipt email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Email To {receiptData.customerName || "Customer"}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24 flex items-center gap-1">
              From
              <span className="text-blue-500 cursor-help" title="From email address">i</span>
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={emailData.from}
                onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
                className="w-full px-3 py-2 text-sm text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24">Send To</label>
            <div className="flex-1">
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2 text-sm text-gray-900 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => setShowCc(!showCc)} className="text-blue-600 hover:text-blue-700">Cc</button>
              <button onClick={() => setShowBcc(!showBcc)} className="text-blue-600 hover:text-blue-700">Bcc</button>
            </div>
          </div>

          {showCc && (
            <div className="border-b border-gray-200 px-6 py-4 flex items-center">
              <label className="text-sm text-gray-600 w-24">Cc</label>
              <input
                type="text"
                value={emailData.cc}
                onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                placeholder="Add Cc recipients (comma separated)"
                className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
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
                placeholder="Add Bcc recipients (comma separated)"
                className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
              />
            </div>
          )}

          <div className="border-b border-gray-200 px-6 py-4 flex items-center">
            <label className="text-sm text-gray-600 w-24">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
            />
          </div>

          <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded" title="Bold"><Bold size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Italic"><Italic size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Underline"><Underline size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Strikethrough"><Strikethrough size={16} className="text-gray-600" /></button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <select className="px-2 py-1 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>16 px</option>
              <option>12 px</option>
              <option>14 px</option>
              <option>18 px</option>
              <option>20 px</option>
            </select>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert Link"><LinkIcon size={16} className="text-gray-600" /></button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert Image"><ImageIcon size={16} className="text-gray-600" /></button>
          </div>

          <div className="px-6 py-4">
            <div
              ref={editorRef}
              className="min-h-[400px] max-h-[600px] overflow-y-auto text-sm text-gray-900 focus:outline-none"
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
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Attach Sales Receipt PDF</span>
            </label>

            {emailData.attachPDF && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700 font-medium">{receiptData.receiptNumber || "SR-00001"}</span>
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
            className={`px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${isSending ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isSending ? "Sending..." : "Send"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSending}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
