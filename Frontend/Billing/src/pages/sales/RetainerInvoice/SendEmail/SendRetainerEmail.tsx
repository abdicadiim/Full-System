import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bold, Italic, Underline, Image as ImageIcon, Link as LinkIcon, Paperclip, HelpCircle, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getCustomers, getInvoiceById, updateInvoice } from "../../salesModel";
import { invoicesAPI } from "../../../../services/api";

const formatDate = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toAmount = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitEmailList = (value: string) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function SendRetainerEmail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bodyEditorRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [emailData, setEmailData] = useState({
    fromName: "Taban Enterprise",
    fromEmail: "billing@example.com",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    attachPdf: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        navigate("/sales/retainer-invoices");
        return;
      }

      try {
        setLoading(true);
        const data = await getInvoiceById(id);
        if (cancelled) return;
        if (!data) {
          navigate("/sales/retainer-invoices");
          return;
        }
        const customerId = String(
          (data as any)?.customer?._id ||
            (data as any)?.customer?.id ||
            (data as any)?.customerId ||
            ""
        ).trim();
        const existingCustomerEmail = String((data as any)?.customerEmail || (data as any)?.customer?.email || "").trim();
        const existingCustomerName = String((data as any)?.customerName || (data as any)?.customer?.displayName || (data as any)?.customer?.name || "").trim();

        if (!existingCustomerEmail && customerId) {
          try {
            const customers = await getCustomers({ limit: 1000 });
            const matched = (Array.isArray(customers) ? customers : []).find(
              (c: any) => String(c?._id || c?.id || "").trim() === customerId
            );
            setInvoice({
              ...data,
              customerEmail: String(matched?.email || "").trim() || existingCustomerEmail,
              customerName:
                String(matched?.displayName || matched?.name || matched?.companyName || "").trim() ||
                existingCustomerName,
            });
          } catch {
            setInvoice(data);
          }
        } else {
          setInvoice(data);
        }
      } catch (error) {
        console.error("Failed to load retainer invoice for email:", error);
        if (!cancelled) navigate("/sales/retainer-invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const defaultBody = useMemo(() => {
    const invoiceNumber = String(invoice?.invoiceNumber || "-");
    const invoiceDate = formatDate(invoice?.invoiceDate || invoice?.date);
    const amount = toAmount(invoice?.balance ?? invoice?.balanceDue ?? invoice?.total ?? invoice?.amount);
    const currency = String(invoice?.currency || "USD");
    const senderName = String(invoice?.organizationName || "Taban Enterprise");

    return `
<p>Dear Customer,</p>
<p>Thanks for your business.</p>
<p>The retainer invoice ${invoiceNumber} is attached with this email.</p>
<p>
Retainer Invoice Overview:<br/>
Invoice #: ${invoiceNumber}<br/>
Date : ${invoiceDate}<br/>
Amount : ${currency}${amount.toFixed(2)}
</p>
<p>It was great working with you. Looking forward to working with you again.</p>
<p>Regards,<br/>${senderName}</p>
`;
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    const customerEmail = String(invoice?.customerEmail || invoice?.customer?.email || "").trim();
    const fromName = String(invoice?.organizationName || "Taban Enterprise").trim() || "Taban Enterprise";
    const fromEmail = String(invoice?.organizationEmail || "billing@example.com").trim() || "billing@example.com";
    const invoiceNumber = String(invoice?.invoiceNumber || "-");
    setEmailData((prev) => ({
      ...prev,
      fromName,
      fromEmail,
      to: prev.to || customerEmail,
      subject: prev.subject || `Retainer Invoice from ${fromName} (${invoiceNumber})`,
      body: defaultBody,
    }));
  }, [invoice, defaultBody]);

  useEffect(() => {
    if (!bodyEditorRef.current) return;
    bodyEditorRef.current.innerHTML = emailData.body || "";
  }, [emailData.body]);

  const handleSend = async () => {
    if (!id) return;
    if (!emailData.to.trim()) {
      toast.error("Recipient email is required.");
      return;
    }
    if (!emailData.subject.trim()) {
      toast.error("Subject is required.");
      return;
    }

    try {
      setSending(true);
      const message = bodyEditorRef.current?.innerHTML || emailData.body || "";
      await invoicesAPI.sendEmail(id, {
        from: `"${emailData.fromName}" <${emailData.fromEmail}>`,
        to: emailData.to.trim(),
        cc: splitEmailList(emailData.cc),
        bcc: splitEmailList(emailData.bcc),
        subject: emailData.subject.trim(),
        body: message,
        attachSystemPDF: emailData.attachPdf,
      });
      const sentComment = {
        id: `comment-${Date.now()}`,
        text: `Retainer Invoice emailed to ${emailData.to.trim()}`,
        author: emailData.fromName || "User",
        timestamp: new Date().toISOString(),
      };
      const existingComments = Array.isArray(invoice?.comments) ? invoice.comments : [];
      const currentStatus = String(invoice?.status || "").toLowerCase();
      await updateInvoice(id, {
        comments: [...existingComments, sentComment],
        emailSent: true as any,
        emailSentAt: new Date().toISOString() as any,
        status: currentStatus === "draft" ? ("sent" as any) : (invoice?.status as any),
      } as any);
      toast.success("Retainer invoice email sent successfully.");
      navigate(`/sales/retainer-invoices/${id}`);
    } catch (error: any) {
      console.error("Failed to send retainer invoice email:", error);
      toast.error(error?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading email composer...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[#f6f7fb]">
      <div className="h-[58px] bg-white border-b border-[#d6d9e3] px-5 flex items-center justify-between">
        <h1 className="text-[34px] leading-none font-normal text-[#111827]">
          Email To {String(invoice?.customerName || "Customer")}
        </h1>
        <button
          type="button"
          onClick={() => navigate(`/sales/retainer-invoices/${id}`)}
          className="h-8 w-8 rounded border border-[#d6d9e3] bg-white text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        <div className="max-w-[780px] rounded border border-[#d6d9e3] bg-white">
          <div className="px-3 py-3 border-b border-[#e5e7eb] flex items-center text-[13px]">
            <div className="w-20 text-[#64748b] inline-flex items-center gap-1">
              <span>From</span>
              <HelpCircle size={12} />
            </div>
            <div className="text-[#0f172a]">{emailData.fromName} &lt;{emailData.fromEmail}&gt;</div>
          </div>

          <div className="px-3 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
            <div className="w-20 text-[#64748b]">Send To</div>
            <input
              type="email"
              value={emailData.to}
              onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
              className="flex-1 bg-transparent outline-none"
              placeholder="recipient@example.com"
            />
            <button type="button" className="text-[#2563eb] text-[12px]" onClick={() => setShowCc((v) => !v)}>Cc</button>
            <button type="button" className="text-[#2563eb] text-[12px]" onClick={() => setShowBcc((v) => !v)}>Bcc</button>
          </div>

          {showCc && (
            <div className="px-3 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
              <div className="w-20 text-[#64748b]">Cc</div>
              <input
                type="text"
                value={emailData.cc}
                onChange={(e) => setEmailData((prev) => ({ ...prev, cc: e.target.value }))}
                className="flex-1 bg-transparent outline-none"
                placeholder="Add Cc recipients"
              />
            </div>
          )}

          {showBcc && (
            <div className="px-3 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
              <div className="w-20 text-[#64748b]">Bcc</div>
              <input
                type="text"
                value={emailData.bcc}
                onChange={(e) => setEmailData((prev) => ({ ...prev, bcc: e.target.value }))}
                className="flex-1 bg-transparent outline-none"
                placeholder="Add Bcc recipients"
              />
            </div>
          )}

          <div className="px-3 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
            <div className="w-20 text-[#64748b]">Subject</div>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
              className="flex-1 bg-transparent outline-none"
            />
          </div>

          <div className="px-3 py-2 border-b border-[#e5e7eb] bg-[#f8fafc] flex items-center gap-3 text-[#334155]">
            <button type="button" className="p-1 hover:bg-white rounded"><Bold size={14} /></button>
            <button type="button" className="p-1 hover:bg-white rounded"><Italic size={14} /></button>
            <button type="button" className="p-1 hover:bg-white rounded"><Underline size={14} /></button>
            <select className="h-7 border rounded text-[12px] px-2 bg-white">
              <option>16px</option>
              <option>14px</option>
              <option>12px</option>
            </select>
            <button type="button" className="p-1 hover:bg-white rounded"><ImageIcon size={14} /></button>
            <button type="button" className="p-1 hover:bg-white rounded"><LinkIcon size={14} /></button>
          </div>

          <div
            ref={bodyEditorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[340px] max-h-[470px] overflow-y-auto p-4 text-[16px] leading-[1.5] outline-none text-[#111827]"
            onInput={(e) => setEmailData((prev) => ({ ...prev, body: (e.target as HTMLElement).innerHTML }))}
          />

          <div className="border-t border-[#e5e7eb] p-3">
            <div className="rounded border border-[#d6d9e3] bg-[#f8fbff] p-2 flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-[13px] text-[#334155]">
                <input
                  type="checkbox"
                  checked={emailData.attachPdf}
                  onChange={(e) => setEmailData((prev) => ({ ...prev, attachPdf: e.target.checked }))}
                />
                <span>Attach Retainer Invoice PDF</span>
              </label>
              <div className="inline-flex items-center gap-1 rounded border border-dashed border-[#d1d5db] px-3 py-1 text-[12px] text-[#475569] min-w-[240px] justify-center">
                <Paperclip size={12} className="text-red-500" />
                <span>{String(invoice?.invoiceNumber || "RET-")}</span>
              </div>
            </div>

            <button type="button" className="mt-2 text-[13px] text-[#2563eb] hover:underline inline-flex items-center gap-1">
              <Paperclip size={13} />
              0 Attachments
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleSend();
            }}
            disabled={sending}
            className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-medium hover:bg-[#1e9f65] disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/sales/retainer-invoices/${id}`)}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
