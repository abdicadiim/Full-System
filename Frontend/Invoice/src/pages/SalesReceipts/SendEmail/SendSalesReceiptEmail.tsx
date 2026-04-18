// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { formatSalesReceiptNumber, getSalesReceiptById } from "../../salesModel";
import { salesReceiptsAPI, senderEmailsAPI, contactPersonsAPI } from "../../../services/api";
import { X, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon, Paperclip, Loader2, Search, Plus } from "lucide-react";
import { formatSenderDisplay, resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import { getCurrentUser } from "../../../services/auth";

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
  const receiptNumber = formatSalesReceiptNumber(receipt?.receiptNumber || receipt?.id || "SR00001") || "SR00001";
  const receiptDate = formatDisplayDate(receipt?.receiptDate || receipt?.date || new Date());
  const currency = String(receipt?.currency || "USD").toUpperCase();
  const amountPaid = `${currency}${parseAmount(receipt?.total ?? receipt?.amount ?? 0).toFixed(2)}`;
  const customerName = receipt?.customerName || receipt?.customer?.displayName || receipt?.customer?.name || "Customer";
  const note = String(receipt?.notes || "").trim() || "Thank you for shopping with us.";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; background-color: #f8fafc; padding: 24px 0;">
      <div style="background-color: #187bff; color: #fff; text-align: center; padding: 14px 0; font-size: 18px; font-weight: 600;">
        SalesReceipt ${receiptNumber}
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
  const sendToDropdownRef = useRef<HTMLDivElement | null>(null);
  const currentUser = getCurrentUser();
  const loginUserName =
    String(
      currentUser?.name ||
      currentUser?.fullName ||
      currentUser?.username ||
      ""
    ).trim() || "System";
  const loginUserEmail = String(currentUser?.email || "").trim();

  const stateReceiptData = location.state?.receiptData || null;
  const [receiptData, setReceiptData] = useState(stateReceiptData || {});
  const [senderName, setSenderName] = useState(
    String(stateReceiptData?.senderName || loginUserName || stateReceiptData?.organizationName || "System").trim() || "System"
  );
  const [senderEmail, setSenderEmail] = useState(
    String(stateReceiptData?.senderEmail || loginUserEmail || "").trim()
  );
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendToDropdown, setShowSendToDropdown] = useState(false);
  const [sendToSearch, setSendToSearch] = useState("");
  const [customerContacts, setCustomerContacts] = useState<any[]>([]);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    salutation: "Mr",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    skypeName: "",
    designation: "",
    department: "",
    enablePortalAccess: false,
  });

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

  useEffect(() => {
    let cancelled = false;

    const loadSender = async () => {
      const fallbackName = String(receiptData?.senderName || loginUserName || receiptData?.organizationName || "System").trim() || "System";
      const fallbackEmail = String(receiptData?.senderEmail || loginUserEmail || "").trim();

      try {
        const primarySenderRes = await senderEmailsAPI.getPrimary();
        const sender = resolveVerifiedPrimarySender(primarySenderRes, fallbackName, fallbackEmail);
        if (!cancelled) {
          setSenderName(sender.name);
          setSenderEmail(sender.email || fallbackEmail);
        }
      } catch (error) {
        console.error("Failed to load verified sender for sales receipt email:", error);
        if (!cancelled) {
          setSenderName(fallbackName);
          setSenderEmail(fallbackEmail);
        }
      }
    };

    if (receiptData && Object.keys(receiptData).length > 0) {
      void loadSender();
    }

    return () => {
      cancelled = true;
    };
  }, [receiptData, loginUserEmail, loginUserName]);

  const defaultEmailBody = useMemo(() => buildSalesReceiptEmailTemplate(receiptData), [receiptData]);

  const [emailData, setEmailData] = useState({
    from: formatSenderDisplay(senderName, senderEmail, "System"),
    to: "",
    cc: "",
    bcc: "",
    subject: "Receipt for your recent purchase from Taban Enterprise",
    body: defaultEmailBody,
    attachPDF: true
  });

  useEffect(() => {
    const customerEmail = String(receiptData?.customerEmail || receiptData?.customer?.email || "").trim();
    setEmailData((prev) => ({
      ...prev,
      from: senderEmail || loginUserEmail
        ? formatSenderDisplay(senderName || loginUserName, senderEmail || loginUserEmail, receiptData?.senderName || loginUserName || receiptData?.organizationName || "System")
        : formatSenderDisplay(senderName, senderEmail, receiptData?.senderName || loginUserName || receiptData?.organizationName || "System"),
      to: customerEmail ? (prev.to || customerEmail) : "",
      subject: prev.subject || "Receipt for your recent purchase from Taban Enterprise",
      body: defaultEmailBody
    }));
  }, [receiptData, defaultEmailBody, senderName, senderEmail, loginUserEmail, loginUserName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sendToDropdownRef.current &&
        !sendToDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSendToDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCustomerContacts = async () => {
      const customerId = String(
        receiptData?.customerId ||
        receiptData?.customer?._id ||
        receiptData?.customer?.id ||
        receiptData?.customer ||
        ""
      ).trim();

      if (!customerId) {
        setCustomerContacts([]);
        return;
      }

      try {
        const response = await contactPersonsAPI.getAll(customerId);
        if (!cancelled && response?.success) {
          setCustomerContacts(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Failed to load customer contacts for sales receipt email:", error);
        if (!cancelled) {
          setCustomerContacts([]);
        }
      }
    };

    void loadCustomerContacts();
    return () => {
      cancelled = true;
    };
  }, [receiptData]);

  const splitEmailList = (value: string) =>
    String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const handleSend = async () => {
    const effectiveReceiptId =
      String(id || "").trim() && String(id) !== "undefined"
        ? String(id)
        : String(receiptData?.id || receiptData?._id || "").trim();

    if (!effectiveReceiptId) {
      toast.error("Sales receipt ID is missing.");
      return;
    }
    if (!String(emailData.to || "").trim()) {
      toast.error("Please enter recipient email.");
      return;
    }

    try {
      setIsSending(true);

      const latestBody = editorRef.current?.innerHTML || emailData.body;

      await salesReceiptsAPI.sendEmail(effectiveReceiptId, {
        to: emailData.to,
        cc: splitEmailList(emailData.cc),
        bcc: splitEmailList(emailData.bcc),
        from: emailData.from,
        subject: emailData.subject,
        body: latestBody,
        attachSystemPDF: emailData.attachPDF
      });

      toast.success("Email sent successfully.");
      navigate(`/sales/sales-receipts/${effectiveReceiptId}`);
    } catch (error) {
      console.error("Error sending sales receipt email:", error);
      toast.error("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSaveAndSelectContact = async () => {
    if (!String(newContact.firstName || "").trim() || !String(newContact.email || "").trim()) {
      toast.error("First Name and Email Address are required.");
      return;
    }

    const customerId = String(
      receiptData?.customerId ||
      receiptData?.customer?._id ||
      receiptData?.customer?.id ||
      receiptData?.customer ||
      ""
    ).trim();

    if (!customerId) {
      toast.error("Customer ID not found.");
      return;
    }

    try {
      setIsSavingContact(true);

      const payload = {
        customerId,
        salutation: String(newContact.salutation || "").trim(),
        firstName: String(newContact.firstName || "").trim(),
        lastName: String(newContact.lastName || "").trim(),
        email: String(newContact.email || "").trim(),
        workPhone: String(newContact.workPhone || "").trim(),
        mobile: String(newContact.mobile || "").trim(),
        skypeName: String(newContact.skypeName || "").trim(),
        designation: String(newContact.designation || "").trim(),
        department: String(newContact.department || "").trim(),
        enablePortal: Boolean(newContact.enablePortalAccess),
        hasPortalAccess: Boolean(newContact.enablePortalAccess),
      };

      const response = await contactPersonsAPI.create(payload);
      if (!response?.success) {
        throw new Error("Failed to create contact person.");
      }

      const contactsResponse = await contactPersonsAPI.getAll(customerId);
      const refreshedContacts = Array.isArray(contactsResponse?.data) ? contactsResponse.data : [];
      setCustomerContacts(refreshedContacts);
      setEmailData((prev) => ({ ...prev, to: payload.email }));
      setSendToSearch(payload.email);
      setShowSendToDropdown(false);
      setIsNewContactModalOpen(false);
      setNewContact({
        salutation: "Mr",
        firstName: "",
        lastName: "",
        email: "",
        workPhone: "",
        mobile: "",
        skypeName: "",
        designation: "",
        department: "",
        enablePortalAccess: false,
      });
    } catch (error) {
      console.error("Failed to save contact person from sales receipt email:", error);
      toast.error("Failed to add contact person.");
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="border-b border-[#dbe3ee] bg-white px-6 py-4">
        <div className="mx-auto max-w-[1460px]">
          <h1 className="text-[15px] font-medium text-[#111827]">
            Email To {receiptData.customerName || "Customer"}
          </h1>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1460px] px-3 py-7">
          <div className="max-w-[940px] rounded-sm border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex min-h-[60px] items-center border-b border-[#e4eaf1] px-4">
              <label className="w-[98px] text-[13px] text-[#667085]">
                From <span className="text-[#94a3b8]">?</span>
              </label>
              <input
                type="text"
                value={emailData.from}
                onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
                className="flex-1 border-none bg-transparent px-0 text-[13px] text-[#0f172a] outline-none"
              />
            </div>

            <div className="flex min-h-[60px] items-start border-b border-[#e4eaf1] px-4 py-3">
              <label className="w-[98px] text-[13px] text-[#667085]">Send To</label>
              <div className="relative flex-1" ref={sendToDropdownRef}>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => {
                    setEmailData({ ...emailData, to: e.target.value });
                    setSendToSearch(e.target.value);
                    setShowSendToDropdown(true);
                  }}
                  onFocus={() => {
                    setSendToSearch(emailData.to || "");
                    setShowSendToDropdown(true);
                  }}
                  placeholder=""
                  className="w-full border-none bg-transparent px-0 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />

                {showSendToDropdown && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-[760px] overflow-hidden rounded-md border border-[#dbe2ea] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.14)]">
                    <div className="border-b border-[#e5e7eb] p-3">
                      <div className="flex items-center gap-2 rounded-md border border-[#3b82f6] bg-white px-3 py-2 shadow-[0_0_0_2px_rgba(59,130,246,0.08)]">
                        <Search size={15} className="text-[#94a3b8]" />
                        <input
                          type="text"
                          value={sendToSearch}
                          onChange={(e) => {
                            setSendToSearch(e.target.value);
                            setEmailData({ ...emailData, to: e.target.value });
                          }}
                          placeholder="Search"
                          className="w-full border-none bg-transparent text-[14px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {customerContacts.filter((contact) => {
                        const fullName = `${contact?.salutation || ""} ${contact?.firstName || ""} ${contact?.lastName || ""}`.trim().toLowerCase();
                        const email = String(contact?.email || "").toLowerCase();
                        const query = String(sendToSearch || "").trim().toLowerCase();
                        if (!query) return true;
                        return fullName.includes(query) || email.includes(query);
                      }).length === 0 ? (
                        <div className="border-b border-[#e5e7eb] px-3 py-3 text-[13px] uppercase text-[#667085]">
                          NO CONTACT PERSONS FOUND.
                        </div>
                      ) : (
                        customerContacts
                          .filter((contact) => {
                            const fullName = `${contact?.salutation || ""} ${contact?.firstName || ""} ${contact?.lastName || ""}`.trim().toLowerCase();
                            const email = String(contact?.email || "").toLowerCase();
                            const query = String(sendToSearch || "").trim().toLowerCase();
                            if (!query) return true;
                            return fullName.includes(query) || email.includes(query);
                          })
                          .map((contact) => {
                            const fullName = `${contact?.salutation || ""} ${contact?.firstName || ""} ${contact?.lastName || ""}`.trim();
                            const email = String(contact?.email || "").trim();
                            return (
                              <button
                                key={String(contact?.id || contact?._id || email)}
                                type="button"
                                className="flex w-full items-start justify-between border-b border-[#eef2f6] px-3 py-3 text-left transition-colors hover:bg-[#f8fbff]"
                                onClick={() => {
                                  setEmailData((prev) => ({ ...prev, to: email }));
                                  setSendToSearch(email);
                                  setShowSendToDropdown(false);
                                }}
                              >
                                <div>
                                  <div className="text-[14px] font-medium text-[#111827]">{fullName || email}</div>
                                  <div className="mt-0.5 text-[12px] text-[#667085]">{email}</div>
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-3 text-[14px] font-medium text-[#4f83ff] transition-colors hover:bg-[#f8fbff]"
                      onClick={() => {
                        setShowSendToDropdown(false);
                        setIsNewContactModalOpen(true);
                      }}
                    >
                      <Plus size={14} className="rounded-full bg-[#4f83ff] text-white" />
                      Add Contact Person
                    </button>
                  </div>
                )}
              </div>
              <div className="ml-4 flex items-center gap-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
                >
                  Cc
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
                >
                  Bcc
                </button>
              </div>
            </div>

            {showCc && (
              <div className="flex min-h-[60px] items-center border-b border-[#e4eaf1] px-4">
                <label className="w-[98px] text-[13px] text-[#667085]">Cc</label>
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                  placeholder="Add Cc recipients"
                  className="flex-1 border-none bg-transparent px-0 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            )}

            {showBcc && (
              <div className="flex min-h-[60px] items-center border-b border-[#e4eaf1] px-4">
                <label className="w-[98px] text-[13px] text-[#667085]">Bcc</label>
                <input
                  type="text"
                  value={emailData.bcc}
                  onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                  placeholder="Add Bcc recipients"
                  className="flex-1 border-none bg-transparent px-0 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            )}

            <div className="flex min-h-[60px] items-center border-b border-[#e4eaf1] px-4">
              <label className="w-[98px] text-[13px] text-[#667085]">Subject</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                className="flex-1 border-none bg-transparent px-0 text-[13px] text-[#0f172a] outline-none"
              />
            </div>

            <div className="flex min-h-[42px] items-center gap-1 border-b border-[#e4eaf1] bg-[#f5f7fb] px-4">
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Bold">
                <Bold size={16} className="text-[#374151]" />
              </button>
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Italic">
                <Italic size={16} className="text-[#374151]" />
              </button>
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Underline">
                <Underline size={16} className="text-[#374151]" />
              </button>
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Strikethrough">
                <Strikethrough size={16} className="text-[#374151]" />
              </button>
              <div className="mx-2 h-5 w-px bg-[#d5dbe5]" />
              <select className="h-8 rounded border border-transparent bg-transparent px-2 text-[13px] font-medium text-[#111827] outline-none hover:border-[#d5dbe5] hover:bg-white focus:border-[#d5dbe5]">
                <option>16px</option>
                <option>12px</option>
                <option>14px</option>
                <option>18px</option>
                <option>20px</option>
              </select>
              <span className="text-[#94a3b8]">-</span>
              <select className="h-8 rounded border border-transparent bg-transparent px-2 text-[13px] font-medium text-[#111827] outline-none hover:border-[#d5dbe5] hover:bg-white focus:border-[#d5dbe5]">
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Georgia</option>
              </select>
              <div className="mx-2 h-5 w-px bg-[#d5dbe5]" />
              <button type="button" className="rounded px-2 py-1.5 text-[15px] font-medium text-[#374151] hover:bg-white" title="Align Left">
                ≡
              </button>
              <button type="button" className="rounded px-2 py-1.5 text-[15px] font-medium text-[#374151] hover:bg-white" title="Bullets">
                ≣
              </button>
              <div className="mx-2 h-5 w-px bg-[#d5dbe5]" />
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Insert Image">
                <ImageIcon size={16} className="text-[#374151]" />
              </button>
              <button type="button" className="rounded px-2 py-1.5 hover:bg-white" title="Insert Link">
                <LinkIcon size={16} className="text-[#374151]" />
              </button>
            </div>

            <div className="border-b border-[#e4eaf1] bg-white px-4 py-0">
              <div
                ref={editorRef}
                className="min-h-[368px] max-h-[430px] overflow-y-auto px-4 py-3 text-[14px] leading-6 text-[#111827] focus:outline-none"
                contentEditable
                dangerouslySetInnerHTML={{ __html: emailData.body }}
                onBlur={(e) => setEmailData({ ...emailData, body: e.currentTarget.innerHTML })}
              />
            </div>

            <div className="border-b border-[#e4eaf1] bg-[#f8fbff] px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-2 text-[14px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={emailData.attachPDF}
                    onChange={(e) => setEmailData({ ...emailData, attachPDF: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                  />
                  <span>Attach Sales Receipt PDF</span>
                </label>

                {emailData.attachPDF && (
                  <div className="flex min-w-[300px] items-center gap-3 rounded border border-dashed border-[#d7dee9] bg-white px-3 py-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#fff1f2]">
                      <svg className="h-4 w-4 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                      </svg>
                    </div>
                    <span className="text-[13px] text-[#334155]">
                      {formatSalesReceiptNumber(receiptData.receiptNumber || "SR00001") || "SR00001"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-dashed border-[#d7dee9] px-4 py-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-[14px] text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
              >
                <Paperclip size={14} />
                Attachments
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-[#e4eaf1] bg-white px-4 py-4">
              <button
                onClick={handleSend}
                disabled={isSending}
                className={`flex items-center gap-2 rounded-md bg-[#22c55e] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#16a34a] ${isSending ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : null}
                {isSending ? "Sending..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSending}
                className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 mt-10 border-t border-[#e4eaf1] bg-[#f7f9fc] py-4">
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={handleSend}
                disabled={isSending}
                className={`flex items-center gap-2 rounded-md bg-[#22c55e] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#16a34a] ${isSending ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : null}
                {isSending ? "Sending..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSending}
                className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-[14px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {isNewContactModalOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsNewContactModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-[15px] font-medium text-[#111827]">Add Contact Person</h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded border border-[#3b82f6] bg-white text-red-500 transition-colors hover:bg-red-50"
                onClick={() => setIsNewContactModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-8 px-5 py-5 lg:grid-cols-[1fr_216px]">
              <div className="space-y-4">
                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#4b5563]">Name</label>
                  <div className="grid grid-cols-[90px_1fr_1fr] gap-3">
                    <select
                      value={newContact.salutation}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, salutation: e.target.value }))}
                      className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] text-[#667085] outline-none focus:border-[#3b82f6]"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={newContact.firstName}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newContact.lastName}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#4b5563]">Email Address</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div className="grid grid-cols-[160px_1fr] items-start gap-4">
                  <label className="pt-2 text-[14px] text-[#4b5563]">Phone</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[60px_1fr] gap-0">
                      <input value="+252" readOnly className="h-10 rounded-l border border-r-0 border-[#cbd5e1] bg-[#f8fafc] px-3 text-[14px] text-[#667085] outline-none" />
                      <input
                        type="text"
                        placeholder="Work Phone"
                        value={newContact.workPhone}
                        onChange={(e) => setNewContact((prev) => ({ ...prev, workPhone: e.target.value }))}
                        className="h-10 rounded-r border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                      />
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-0">
                      <input value="+252" readOnly className="h-10 rounded-l border border-r-0 border-[#cbd5e1] bg-[#f8fafc] px-3 text-[14px] text-[#667085] outline-none" />
                      <input
                        type="text"
                        placeholder="Mobile"
                        value={newContact.mobile}
                        onChange={(e) => setNewContact((prev) => ({ ...prev, mobile: e.target.value }))}
                        className="h-10 rounded-r border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#4b5563]">Skype Name/Number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3b82f6]">S</span>
                    <input
                      type="text"
                      placeholder="Skype Name/Number"
                      value={newContact.skypeName}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, skypeName: e.target.value }))}
                      className="h-10 w-full rounded border border-[#cbd5e1] px-10 text-[14px] outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#4b5563]">Other Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Designation"
                      value={newContact.designation}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, designation: e.target.value }))}
                      className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                    />
                    <input
                      type="text"
                      placeholder="Department"
                      value={newContact.department}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, department: e.target.value }))}
                      className="h-10 rounded border border-[#cbd5e1] px-3 text-[14px] outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                <div className="border-t border-[#e5e7eb] pt-5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(newContact.enablePortalAccess)}
                      onChange={(e) => setNewContact((prev) => ({ ...prev, enablePortalAccess: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    <div>
                      <div className="text-[14px] font-medium text-[#374151]">Enable portal access</div>
                      <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#667085]">
                        This customer will be able to see all their transactions with your organization by logging in to the portal using their email address.
                        <span className="ml-1 text-[#2563eb]">Learn More</span>
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex">
                <div className="flex h-[214px] w-full flex-col items-center justify-center rounded border border-dashed border-[#cbd5e1] px-6 text-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#60a5fa] text-white">↑</div>
                  <p className="mt-4 text-[14px] text-[#374151]">Drag &amp; Drop Profile Image</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#94a3b8]">
                    Supported Files: jpg, jpeg, png, gif, bmp
                  </p>
                  <p className="mt-5 text-[13px] text-[#94a3b8]">Maximum File Size: 5MB</p>
                  <button type="button" className="mt-5 text-[14px] font-medium text-[#374151] underline">
                    Upload File
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#e5e7eb] px-5 py-4">
              <button
                type="button"
                onClick={handleSaveAndSelectContact}
                disabled={isSavingContact}
                className={`rounded-md bg-[#22c55e] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#16a34a] ${isSavingContact ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isSavingContact ? "Saving..." : "Save and Select"}
              </button>
              <button
                type="button"
                onClick={() => setIsNewContactModalOpen(false)}
                className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-[14px] text-[#4b5563] transition-colors hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
