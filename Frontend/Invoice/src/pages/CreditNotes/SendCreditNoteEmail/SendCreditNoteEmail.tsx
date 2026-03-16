import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { getCreditNoteById } from "../../salesModel";

export default function SendCreditNoteEmail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creditNote, setCreditNote] = useState(null);
  const [emailData, setEmailData] = useState({
    from: "JIRDE HUSSEIN KHALIF <jirdehusseinkhalif@gmail.com>",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachCreditNotePDF, setAttachCreditNotePDF] = useState(true);
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCreditNote = async () => {
      if (id) {
        const creditNoteData = await getCreditNoteById(id);
        if (creditNoteData) {
          setCreditNote(creditNoteData);
          setEmailData({
            from: "JIRDE HUSSEIN KHALIF <jirdehusseinkhalif@gmail.com>",
            sendTo: creditNoteData.customerEmail || creditNoteData.customer || "",
            cc: "JIRDE HUSSEIN KHALIF <jirdehusseinkhalif@gmail.com>",
            bcc: "",
            subject: `Credit Note - ${creditNoteData.creditNoteNumber || creditNoteData.id}`,
            body: "",
          });
        } else {
          navigate("/sales/credit-notes");
        }
      }
    };
    fetchCreditNote();
  }, [id, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount, currency = "USD") => {
    return `${currency}${parseFloat(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleSend = () => {
    if (!emailData.sendTo) {
      alert("Please enter a recipient email address");
      return;
    }
    // Here you would typically send the email
    console.log("Sending email:", emailData, attachments);
    alert("Email sent successfully!");
    navigate(`/sales/credit-notes/${id}`);
  };

  const handleCancel = () => {
    navigate(`/sales/credit-notes/${id}`);
  };

  if (!creditNote) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Email To {creditNote.customerName || creditNote.customer || "Customer"}
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
      <div className="max-w-4xl mx-auto p-6">
        {/* From Field */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              From
              <HelpCircle size={14} className="text-gray-500 cursor-help" />
            </label>
            <input
              type="text"
              value={emailData.from}
              onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Send To Field */}
          <div className="mb-5">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                <input
                  type="text"
                  value={emailData.sendTo}
                  onChange={(e) => setEmailData({ ...emailData, sendTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex gap-2 pb-2">
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
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cc</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => {
                    setEmailData({ ...emailData, cc: "" });
                    setShowCc(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bcc</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailData.bcc}
                  onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => {
                    setEmailData({ ...emailData, bcc: "" });
                    setShowBcc(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rich Text Editor Toolbar */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md mb-2 flex-wrap">
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
            contentEditable
            className="min-h-[400px] p-4 border border-gray-300 rounded-md text-sm outline-none bg-white overflow-y-auto"
            style={{
              fontWeight: isBold ? "bold" : "normal",
              fontStyle: isItalic ? "italic" : "normal",
              textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
              fontSize: `${fontSize}px`,
            }}
            onInput={(e) => setEmailData({ ...emailData, body: e.target.textContent })}
            suppressContentEditableWarning={true}
          >
            {/* Logo */}
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center" }}>
              <div style={{
                width: "32px",
                height: "32px",
                backgroundColor: "#2563eb",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: "14px",
                marginRight: "8px"
              }}>
                TB
              </div>
            </div>

            {/* Credit Note Banner */}
            <div style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              padding: "16px",
              borderRadius: "6px",
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "16px"
            }}>
              Credit Note #{creditNote.creditNoteNumber || creditNote.id}
            </div>

            {/* Email Content */}
            <div style={{ marginBottom: "16px" }}>
              <p>Dear {creditNote.customerName || creditNote.customer || "Customer"},</p>
              <p style={{ marginTop: "12px" }}>
                Thank you for your business. Your credit note can be viewed, printed and downloaded as PDF from the link below.
              </p>
            </div>

            {/* Credit Note Summary Box */}
            <div style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "16px",
              textAlign: "center"
            }}>
              <div style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "8px"
              }}>
                CREDIT NOTE AMOUNT
              </div>
              <div style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#dc2626",
                marginBottom: "8px"
              }}>
                {formatCurrency(creditNote.total || creditNote.amount, creditNote.currency)}
              </div>
              <div style={{
                borderTop: "1px solid #fed7aa",
                paddingTop: "12px",
                marginTop: "12px",
                textAlign: "left",
                fontSize: "14px",
                color: "#111827"
              }}>
                <div style={{ marginBottom: "4px" }}>
                  Credit Note No <strong>{creditNote.creditNoteNumber || creditNote.id}</strong>
                </div>
                <div>
                  Credit Date <strong>{formatDate(creditNote.creditNoteDate || creditNote.date)}</strong>
                </div>
                <div style={{ marginTop: "8px" }}>
                  Credits Remaining <strong>{formatCurrency(creditNote.balance || creditNote.total || creditNote.amount, creditNote.currency)}</strong>
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  VIEW CREDIT NOTE
                </button>
              </div>
            </div>

            {/* Signature */}
            <div style={{ marginTop: "24px" }}>
              <p>Regards,</p>
              <p style={{ fontWeight: "600" }}>JIRDE HUSSEIN KHALIF</p>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            {/* Attach Credit Note PDF Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachCreditNotePDF}
                  onChange={(e) => setAttachCreditNotePDF(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Attach Credit Note PDF</span>
              </label>
              {attachCreditNotePDF && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <FileText size={16} className="text-gray-500" />
                  <span className="flex-1 text-sm text-gray-900">{creditNote.creditNoteNumber || creditNote.id}</span>
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
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

