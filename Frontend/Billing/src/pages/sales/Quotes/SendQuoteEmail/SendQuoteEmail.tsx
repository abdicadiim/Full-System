import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  HelpCircle,
  Plus,
  Search,
  ChevronDown,
  Check
} from "lucide-react";
import { getQuoteById, updateQuote, Quote, ContactPerson, AttachedFile } from "../../salesModel";
import { emailTemplatesAPI, quotesAPI, contactPersonsAPI, senderEmailsAPI } from "../../../../services/api";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import { applyEmailTemplate } from "../../../settings/emailTemplateUtils";


export default function SendQuoteEmail() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingStage, setSendingStage] = useState("");
  const [senderName, setSenderName] = useState("");

  const [emailData, setEmailData] = useState({
    from: "",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    attachments: [] as AttachedFile[]
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [attachQuotePDF, setAttachQuotePDF] = useState(true);
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const [isBodyDirty, setIsBodyDirty] = useState(false);

  // Contact Persons state
  const [customerContacts, setCustomerContacts] = useState<ContactPerson[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    salutation: "Mr."
  });
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const preloadedQuoteFromState = (location.state as { preloadedQuote?: Quote } | null)?.preloadedQuote;

  const safeParseJson = (value: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const containsHtmlMarkup = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

  const getCurrentUserProfile = () => {
    if (typeof window === "undefined") return { name: "", email: "" };
    const user = safeParseJson(localStorage.getItem("user")) || {};
    const profile = safeParseJson(localStorage.getItem("profile")) || {};
    const name = user?.name || user?.fullName || user?.username || profile?.name || "";
    const email = user?.email || profile?.email || "";
    return { name, email };
  };

  const getOrganizationProfileForPdf = () => {
    if (typeof window === "undefined") {
      return { name: "", email: "", phone: "", street: "", city: "", state: "", country: "" };
    }

    const organizationProfile = safeParseJson(localStorage.getItem("organization_profile")) || {};
    const orgProfile = safeParseJson(localStorage.getItem("org_profile")) || {};
    const organization = safeParseJson(localStorage.getItem("organization")) || {};
    const currentUser = getCurrentUserProfile();
    const address = organizationProfile?.address || {};

    const name =
      organizationProfile?.name ||
      orgProfile?.organizationName ||
      organization?.name ||
      organization?.organizationName ||
      "";
    const email =
      organizationProfile?.email ||
      orgProfile?.email ||
      organization?.email ||
      currentUser.email ||
      "";
    const phone =
      organizationProfile?.phone ||
      orgProfile?.phone ||
      organization?.phone ||
      "";
    const street = [
      address?.street1,
      address?.street2,
      orgProfile?.street1,
      orgProfile?.street2
    ].filter(Boolean).join(" ").trim();
    const city = address?.city || orgProfile?.city || "";
    const state = address?.state || address?.stateProvince || orgProfile?.state || "";
    const country = address?.country || orgProfile?.country || orgProfile?.location || "";

    return { name, email, phone, street, city, state, country };
  };

  useEffect(() => {
    let isMounted = true;

    const fetchQuote = async () => {
      if (!quoteId) return;

      try {
        const preloadedQuoteId = String((preloadedQuoteFromState as any)?.id || (preloadedQuoteFromState as any)?._id || "");
        const shouldUsePreloadedQuote =
          Boolean(preloadedQuoteFromState) && preloadedQuoteId === String(quoteId);

        const quoteData = shouldUsePreloadedQuote
          ? preloadedQuoteFromState!
          : await getQuoteById(quoteId);

        if (!quoteData) {
          navigate("/sales/quotes");
          return;
        }

        if (!isMounted) return;
        setQuote(quoteData);

        const userProfile = getCurrentUserProfile();
        const organizationProfile = getOrganizationProfileForPdf();
        let resolvedSenderName = userProfile.name || "";
        let resolvedSenderEmail = userProfile.email || "";
        const customerId = quoteData.customerId || (quoteData.customer ? (quoteData.customer._id || quoteData.customer) : null);

        const settingsPromise = fetch(`${API_BASE_URL}/settings/general`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const contactsPromise = customerId
          ? contactPersonsAPI.getAll(customerId)
          : Promise.resolve(null);

        const [primarySenderResult, templateResult] = await Promise.allSettled([
          senderEmailsAPI.getPrimary(),
          emailTemplatesAPI.getByKey("quote_notification"),
        ]);

        if (!isMounted) return;

        if (primarySenderResult.status === "fulfilled") {
          const primarySenderRes = primarySenderResult.value;
          if (primarySenderRes && primarySenderRes.success && primarySenderRes.data) {
            if (!resolvedSenderName) {
              resolvedSenderName = primarySenderRes.data.name || "";
            }
            resolvedSenderEmail = primarySenderRes.data.email || resolvedSenderEmail;
          }
        } else {
          console.error("Error fetching primary sender:", primarySenderResult.reason);
        }

        if (!resolvedSenderName) {
          resolvedSenderName = "Team";
        }

        const quoteAmount = Number(quoteData.total || 0);
        const currency = quoteData.currency || "USD";
        const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(quoteAmount);
        const dateToFormat = quoteData.date || quoteData.quoteDate;
        const quoteDate = dateToFormat
          ? new Date(dateToFormat).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "N/A";

        setSenderName(resolvedSenderName);
        const companyName = organizationProfile.name || "Taban Enterprise";
        let templateSubject = `Quote from ${resolvedSenderName || "our team"} (Quote #: ${quoteData.quoteNumber})`;
        const quotePublicId = quoteData.id || (quoteData as any)._id || quoteId;

        const emailBody = `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
    <h1 style="margin: 0; font-size: 36px; font-weight: 400;">Quote #${quoteData.quoteNumber}</h1>
  </div>

  <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 4px 4px;">
    <p>Dear ${quoteData.customerName || "Customer"},</p>

    <p>Thank you for contacting us. Your quote can be viewed, printed and downloaded as PDF from the link below.</p>

    <div style="background-color: #fefce8; border: 1px solid #fef9c3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 4px;">
      <div style="font-size: 36px; color: #111827; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.3px;">QUOTE AMOUNT</div>
      <div style="font-size: 24px; color: #ef4444; font-weight: bold; margin-bottom: 15px;">${formattedAmount}</div>

      <div style="text-align: left; max-width: 240px; margin: 0 auto; border-top: 1px solid #e5e7eb; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-size: 12px; color: #6b7280;">Quote No</span>
          <span style="font-size: 12px; font-weight: bold;">${quoteData.quoteNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 12px; color: #6b7280;">Quote Date</span>
          <span style="font-size: 12px; font-weight: bold;">${quoteDate}</span>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <a href="${window.location.origin}/portal/quotes/${quotePublicId}" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">VIEW QUOTE</a>
      </div>
    </div>

    <div style="margin-top: 30px; padding-top: 20px;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Regards,</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 14px;">${resolvedSenderName}</p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">${companyName}</p>
    </div>
  </div>
</div>
`;

        let resolvedBody = emailBody;
        if (templateResult.status === "fulfilled") {
          const template = templateResult.value?.data;
          if (template) {
            templateSubject = applyEmailTemplate(template.subject || templateSubject, {
              CompanyName: companyName,
              QuoteNumber: quoteData.quoteNumber,
              CustomerName: quoteData.customerName || "Customer",
              SenderName: resolvedSenderName || "Team",
              Amount: formattedAmount,
              QuoteDate: quoteDate,
            });
            const templateBodySource = String(template.emailBody || template.body || "").trim();
            if (templateBodySource && containsHtmlMarkup(templateBodySource)) {
              resolvedBody = applyEmailTemplate(templateBodySource, {
                CompanyName: companyName,
                QuoteNumber: quoteData.quoteNumber,
                CustomerName: quoteData.customerName || "Customer",
                SenderName: resolvedSenderName || "Team",
                Amount: formattedAmount,
                QuoteDate: quoteDate,
              });
            }
          }
        } else {
          console.error("Error loading quote email template:", templateResult.reason);
        }

        setEmailData({
          from: resolvedSenderEmail ? `"${resolvedSenderName}" <${resolvedSenderEmail}>` : resolvedSenderName,
          sendTo: quoteData.customer?.email || quoteData.customerEmail || "",
          cc: "",
          bcc: "",
          subject: templateSubject,
          body: resolvedBody,
          attachments: [] as AttachedFile[],
        });
        setIsBodyDirty(false);

        void settingsPromise
          .then(async (settingsResponse) => {
            if (!isMounted || !settingsResponse.ok) return;
            const settingsJson = await settingsResponse.json();
            const attachByDefault =
              settingsJson?.data?.settings?.pdfSettings?.attachPDFInvoice ?? true;
            if (isMounted) {
              setAttachQuotePDF(Boolean(attachByDefault));
            }
          })
          .catch((settingsError) => {
            console.error("Error loading general settings for quote email:", settingsError);
          });

        void contactsPromise
          .then((contactsResponse: any) => {
            if (!isMounted) return;
            if (contactsResponse && contactsResponse.success && contactsResponse.data) {
              setCustomerContacts(contactsResponse.data);
            }
          })
          .catch((contactsError) => {
            if (customerId) {
              console.error("Error loading customer contacts:", contactsError);
            }
          });
      } catch (error) {
        console.error("Error fetching quote for email:", error);
        navigate("/sales/quotes");
      }
    };

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [quoteId, navigate, preloadedQuoteFromState]);

  useEffect(() => {
    if (!bodyEditorRef.current || isBodyDirty) return;
    if (emailData.body) {
      bodyEditorRef.current.innerHTML = emailData.body;
    }
  }, [emailData.body, isBodyDirty]);

  // Handle click outside contact dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: number | string | undefined, currency = "AMD") => {
    const num = parseFloat(String(amount ?? 0)) || 0;
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "EUR",
      GBP: "GBP",
      AMD: "AMD",
      AED: "AED",
      INR: "INR",
      JPY: "JPY",
      CNY: "CNY",
      RUB: "RUB",
      KES: "KSh",
      NGN: "NGN"
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });

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

  const generateQuoteDetailHtml = (quoteData: Quote) => {
    if (!quoteData) return "";
    const quoteAny = quoteData as any;

    const itemsHtml = quoteData.items && quoteData.items.length > 0 ? quoteData.items.map((item: any, index: number) => {
      const itemQty = parseFloat(String(item.quantity || 0)).toFixed(2);
      const itemUnit = item.unit || "pcs";
      const itemName = item.name || item.itemName || item.itemDetails || "N/A";
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-size: 14px; color: #111;">${index + 1}</td>
          <td style="padding: 12px; font-size: 14px; color: #111;">${itemName}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${itemQty} ${itemUnit}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatCurrency(item.rate || item.price || 0, quoteData.currency)}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatCurrency(item.amount || (item.quantity * (item.rate || item.price || 0)), quoteData.currency)}</td>
        </tr>
      `;
    }).join("") : '<tr><td colspan="5" style="padding: 24px; text-align: center; color: #666; font-size: 14px;">No items added</td></tr>';

    const quoteDate = quoteData.quoteDate || quoteData.date || new Date().toISOString();
    const formattedDate = (() => {
      const date = new Date(quoteDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    })();
    const getCustomerName = (q: any) => {
      if (q.customerName) return q.customerName;
      if (typeof q.customer === "object" && q.customer) {
        return q.customer.displayName || q.customer.name || "N/A";
      }
      return q.customer || "N/A";
    };
    const customerName = getCustomerName(quoteData);
    const total = formatCurrency(quoteData.total || quoteData.amount || 0, quoteData.currency || "KES");
    const notes = quoteData.customerNotes || "Looking forward for your business.";
    const profile = getOrganizationProfileForPdf();
    const organizationName = quoteAny.organizationName || quoteAny.companyName || quoteAny.businessName || profile.name || "Your Company";
    const organizationEmail = quoteAny.organizationEmail || quoteAny.companyEmail || quoteAny.email || profile.email || "";
    const organizationStreet = quoteAny.organizationStreet || quoteAny.street || profile.street || "";
    const organizationCity = quoteAny.organizationCity || quoteAny.city || profile.city || "";
    const organizationState = quoteAny.organizationState || quoteAny.state || profile.state || "";
    const organizationCountry = quoteAny.organizationCountry || quoteAny.country || profile.country || "";
    const organizationPhone = quoteAny.organizationPhone || quoteAny.phone || profile.phone || "";
    const hasSentRibbon = (quoteData.status || "").toLowerCase() === "sent";
    const subTotal = quoteData.subTotal || quoteData.subtotal || quoteData.total || quoteData.amount || 0;

    return `
      <div style="width:794px; min-height:1123px; background:#fff; color:#111; font-family:Arial, sans-serif; position:relative; padding:50px;">
        ${hasSentRibbon ? `
        <div style="position:absolute; top:20px; left:-40px; transform:rotate(-45deg); background:#2563eb; color:#fff; font-size:11px; font-weight:700; padding:6px 50px;">
          SENT
        </div>
        ` : ""}
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:34px;">
          <div style="max-width:55%;">
            <div style="font-size:34px; font-weight:700; color:#111; margin-bottom:6px;">${organizationName}</div>
            ${organizationStreet ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationStreet}</div>` : ""}
            ${(organizationCity || organizationState) ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationCity}${organizationCity && organizationState ? ", " : ""}${organizationState}</div>` : ""}
            ${organizationCountry ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationCountry}</div>` : ""}
            ${organizationPhone ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationPhone}</div>` : ""}
            ${organizationEmail ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationEmail}</div>` : ""}
          </div>
          <div style="text-align:right; min-width:210px;">
            <div style="font-size:52px; font-weight:800; letter-spacing:0.5px; line-height:1;">QUOTE</div>
            <div style="font-size:22px; color:#111; font-weight:700; margin-top:8px;">#${quoteData.quoteNumber || quoteData.id}</div>
            <div style="font-size:14px; color:#475569; margin-top:38px;">${formattedDate}</div>
          </div>
        </div>

        <div style="margin-bottom:26px;">
          <div style="font-size:14px; font-weight:700; color:#111; margin-bottom:6px;">Bill To</div>
          <div style="font-size:28px; color:#2563eb; font-weight:600;">${customerName}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
          <thead>
            <tr>
              <th style="padding:12px; text-align:left; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">#</th>
              <th style="padding:12px; text-align:left; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Item & Description</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Qty</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Rate</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="width:320px; margin-left:auto; margin-bottom:34px;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>Sub Total</span>
            <span style="font-weight:600; color:#111;">${formatCurrency(subTotal, quoteData.currency)}</span>
          </div>
          ${quoteData.discount > 0 ? `
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>Discount</span>
            <span style="font-weight:600; color:#111;">-${formatCurrency(quoteData.discount || 0, quoteData.currency)}</span>
          </div>
          ` : ""}
          ${(typeof quoteData.taxAmount !== 'undefined' && quoteData.taxAmount > 0) ? `
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>${quoteData.taxName || "Tax"}</span>
            <span style="font-weight:600; color:#111;">${formatCurrency(quoteData.taxAmount || 0, quoteData.currency)}</span>
          </div>
          ` : ""}
          <div style="display:flex; justify-content:space-between; padding:12px 0; border-top:2px solid #111; margin-top:8px; font-size:26px; font-weight:700; color:#111;">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>

        <div>
          <div style="font-size:14px; font-weight:700; color:#111; margin-bottom:6px;">Notes</div>
          <div style="font-size:14px; color:#475569; line-height:1.6;">${notes}</div>
        </div>
      </div>
    `;
  };

  const buildQuotePdfAttachment = async () => {
    if (!quote) return null;
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0";
    wrapper.style.width = "794px";
    wrapper.style.background = "#ffffff";
    wrapper.innerHTML = generateQuoteDetailHtml(quote);
    document.body.appendChild(wrapper);

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const renderScale = Math.min(window.devicePixelRatio || 1, 1.5);
      const canvas = await html2canvas(wrapper, {
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: wrapper.scrollWidth,
        windowHeight: wrapper.scrollHeight,
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const imgHeight = (canvas.height * printableWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "JPEG", margin, position, printableWidth, imgHeight, undefined, "FAST");
      heightLeft -= printableHeight;
      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, printableWidth, imgHeight, undefined, "FAST");
        heightLeft -= printableHeight;
      }

      const pdfBlob = pdf.output("blob");
      const base64 = await blobToBase64(pdfBlob);
      return {
        filename: `${quote.quoteNumber || quote.id || "quote"}.pdf`,
        content: base64,
        contentType: "application/pdf",
        encoding: "base64",
      };
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleSend = async () => {
    if (!emailData.sendTo) {
      toast.error("Please enter a recipient email address");
      return;
    }

    setLoading(true);
    setSendingStage("Preparing email...");
    try {
      const outgoingAttachments: any[] = [];
      let attachSystemPdfFallback = false;
      setSendingStage("Preparing attachments...");
      if (attachments.length > 0) {
        const preparedAttachments = await Promise.all(
          attachments.map(async (attachment) => {
            if (!(attachment.file instanceof File)) return null;
            const base64 = await fileToBase64(attachment.file);
            return {
              filename: attachment.name || attachment.file.name,
              content: base64,
              contentType: attachment.type || attachment.file.type || "application/octet-stream",
              encoding: "base64",
            };
          })
        );
        outgoingAttachments.push(...preparedAttachments.filter(Boolean));
      }
      if (attachQuotePDF) {
        setSendingStage("Generating quote PDF...");
        try {
          const quotePdfAttachment = await buildQuotePdfAttachment();
          if (quotePdfAttachment) {
            outgoingAttachments.push(quotePdfAttachment);
          }
        } catch (pdfError) {
          console.error("Error generating quote PDF attachment, falling back to server PDF:", pdfError);
          attachSystemPdfFallback = true;
        }
      }

      const htmlBody = bodyEditorRef.current?.innerHTML || emailData.body;

      // Send email via API
      setSendingStage("Sending email...");
      await quotesAPI.sendEmail(quoteId, {
        to: emailData.sendTo,
        from: emailData.from,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        body: htmlBody,
        attachSystemPDF: attachSystemPdfFallback,
        attachments: outgoingAttachments
      });

      toast.success("Email sent successfully!");
      // Redirect to the quote detail page
      navigate(`/sales/quotes/${quoteId}`, { replace: true });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email. Please try again.");
    } finally {
      setLoading(false);
      setSendingStage("");
    }
  };

  const handleCancel = () => {
    navigate(`/sales/quotes/${quoteId}`);
  };

  const handleSaveNewContact = async () => {
    if (!newContact.firstName || !newContact.email) {
      alert("First Name and Email are required");
      return;
    }

    setLoading(true);
    try {
      if (!quote) {
        alert("Quote information is missing.");
        return;
      }
      const customerId = quote.customerId || (quote.customer ? (typeof quote.customer === 'string' ? quote.customer : (quote.customer as any)._id || (quote.customer as any).id) : null);
      if (!customerId) {
        alert("Customer ID not found");
        return;
      }

      const response = await contactPersonsAPI.create({
        ...newContact,
        customerId
      });

      if (response && response.success) {
        // Refresh contacts
        const contactsResponse = await contactPersonsAPI.getAll(customerId);
        if (contactsResponse && contactsResponse.success && contactsResponse.data) {
          setCustomerContacts(contactsResponse.data);
        }

        // Select the new contact
        setEmailData({ ...emailData, sendTo: newContact.email });

        // Reset and close modal
        setNewContact({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          mobile: "",
          salutation: "Mr."
        });
        setIsNewContactModalOpen(false);
        // Alert is optional but user might like it
      }
    } catch (error) {
      console.error("Error saving new contact:", error);
      alert("Failed to add contact person.");
    } finally {
      setLoading(false);
    }
  };

  if (!quote) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Email To {quote.customerName || "Customer"}
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

          {/* Send To Field with Contact Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between items-center">
              <span>Send To</span>
              <button
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
                onClick={() => setIsNewContactModalOpen(true)}
              >
                <Plus size={12} /> New Contact Person
              </button>
            </label>
            <div className="flex items-end gap-3">
              <div className="flex-1 relative" ref={contactDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={emailData.sendTo}
                    onChange={(e) => {
                      setEmailData({ ...emailData, sendTo: e.target.value });
                      setContactSearch(e.target.value);
                      setShowContactDropdown(true);
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter email address"
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setShowContactDropdown(!showContactDropdown)}
                  >
                    <ChevronDown size={16} />
                  </div>
                </div>

                {/* Contact Dropdown */}
                {showContactDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {customerContacts.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">No contacts found</div>
                    ) : (
                      customerContacts
                        .filter(c =>
                          (c.firstName + " " + (c.lastName || "")).toLowerCase().includes(contactSearch.toLowerCase()) ||
                          (c.email || "").toLowerCase().includes(contactSearch.toLowerCase())
                        )
                        .map(contact => (
                          <div
                            key={contact.id || contact._id}
                            className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${emailData.sendTo === contact.email ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setEmailData({ ...emailData, sendTo: contact.email });
                              setShowContactDropdown(false);
                            }}
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {contact.salutation} {contact.firstName} {contact.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{contact.email}</div>
                            </div>
                            {emailData.sendTo === contact.email && (
                              <Check size={16} className="text-blue-600" />
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
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
            ref={bodyEditorRef}
            contentEditable
            className="min-h-[400px] p-4 border border-gray-300 rounded-md text-sm outline-none bg-white overflow-y-auto"
            style={{
              fontWeight: isBold ? "bold" : "normal",
              fontStyle: isItalic ? "italic" : "normal",
              textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
              fontSize: `${fontSize}px`,
            }}
            onInput={(e) => {
              setIsBodyDirty(true);
              setEmailData({ ...emailData, body: (e.target as HTMLElement).innerHTML || "" });
            }}
            suppressContentEditableWarning={true}
          />

          {/* Attachments Section */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            {/* Attach Quote PDF Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachQuotePDF}
                  onChange={(e) => setAttachQuotePDF(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Attach Quote PDF</span>
              </label>
              {attachQuotePDF && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <FileText size={16} className="text-gray-500" />
                  <span className="flex-1 text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>
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
                const files = e.target.files ? Array.from(e.target.files) : [];
                const newAttachments: AttachedFile[] = files.map(file => ({
                  id: Date.now() + Math.random(),
                  name: file.name,
                  type: file.type,
                  file: file
                }));
                const updatedAttachments: AttachedFile[] = [...attachments, ...newAttachments];
                setAttachments(updatedAttachments);
                setEmailData(prev => ({ ...prev, attachments: updatedAttachments }));
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 bg-transparent"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (sendingStage || "Sending...") : "Send"}
          </button>
        </div>
      </div>

      {/* New Contact Person Modal */}
      {isNewContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Contact Person</h3>
              <button
                onClick={() => setIsNewContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salutation</label>
                  <select
                    value={newContact.salutation}
                    onChange={(e) => setNewContact({ ...newContact, salutation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
                  <input
                    type="text"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={newContact.mobile}
                    onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsNewContactModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewContact}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
