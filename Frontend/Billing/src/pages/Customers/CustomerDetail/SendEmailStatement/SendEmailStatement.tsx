import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getCustomerById } from "../../../salesModel";
import {
  X,
  FileText,
  Eye,
  ChevronDown,
  Info,
  Paperclip,
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
  Type
} from "lucide-react";
import { toast } from "react-toastify";
import { emailTemplatesAPI, senderEmailsAPI, customersAPI, vendorsAPI } from "../../../../services/api";
import { applyEmailTemplate } from "../../../../settings/emailTemplateUtils";

export default function SendEmailStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Format date helper function
  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get statement data from location state or calculate defaults
  const statementData = location.state || {};
  const entityType = statementData.type || "customer";

  // Use raw strings for dependencies to avoid infinite loops with new Date objects
  const startDateStr = statementData.startDate;
  const endDateStr = statementData.endDate;

  const startDate = useMemo(() =>
    startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    [startDateStr]
  );

  const endDate = useMemo(() =>
    endDateStr ? new Date(endDateStr) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    [endDateStr]
  );

  const filterBy = statementData.filterBy || "all";

  const [emailData, setEmailData] = useState({
    from: "Loading...",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: `Account Statement from ${formatDate(startDate)} to ${formatDate(endDate)}`,
    body: ""
  });

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [fontSize, setFontSize] = useState("16");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        // Fetch entity and primary sender in parallel
        const [entityResponse, senderResponse] = await Promise.all([
          entityType === "vendor" ? vendorsAPI.getById(id) : customersAPI.getById(id),
          senderEmailsAPI.getPrimary()
        ]);

        const entityData = entityResponse?.data || entityResponse;

        if (entityData) {
          setCustomer(entityData); // Still using 'customer' state for 'entity' to minimize changes

          let fromAddress = "No Sender Configured";
          if (senderResponse?.success && senderResponse.data) {
            fromAddress = `"${senderResponse.data.name}" <${senderResponse.data.email}>`;
          }

          const initialBody = `Dear ${entityData.displayName || entityData.name || (entityType === "vendor" ? "Vendor" : "Customer")},<br/><br/>
            It's been a great experience working with you.<br/>
            Attached with this email is a list of all transactions for the period between ${formatDate(startDate)} to ${formatDate(endDate)}.<br/>
            If you have any questions, just drop us an email or call us.<br/><br/>
            Regards,<br/>
            ${senderResponse?.data?.name || "The Team"}`;
          let templateSubject = `Account Statement from ${formatDate(startDate)} to ${formatDate(endDate)}`;
          let templateBody = initialBody;
          const templateKey = entityType === "vendor" ? "vendor_statement" : "customer_statement";

          try {
            const templateRes = await emailTemplatesAPI.getByKey(templateKey);
            const template = templateRes?.data;
            if (template) {
              templateSubject = applyEmailTemplate(template.subject || templateSubject, {
                StartDate: formatDate(startDate),
                EndDate: formatDate(endDate),
                CustomerName: entityData.displayName || entityData.name || "Customer",
                VendorName: entityData.displayName || entityData.name || "Vendor",
                SenderName: senderResponse?.data?.name || "The Team",
              });
              templateBody = applyEmailTemplate(template.emailBody || template.body || templateBody, {
                StartDate: formatDate(startDate),
                EndDate: formatDate(endDate),
                CustomerName: entityData.displayName || entityData.name || "Customer",
                VendorName: entityData.displayName || entityData.name || "Vendor",
                SenderName: senderResponse?.data?.name || "The Team",
              }).replace(/\n/g, "<br/>");
            }
          } catch (templateError) {
            console.error("Error loading statement template:", templateError);
          }

          setEmailData(prev => ({
            ...prev,
            from: fromAddress,
            sendTo: entityData.email || "",
            subject: templateSubject,
            body: templateBody
          }));

          if (editorRef.current) {
            editorRef.current.innerHTML = templateBody;
          }
        } else {
          navigate(entityType === "vendor" ? "/purchases/vendors" : "/sales/customers");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, startDateStr, endDateStr, entityType]);

  const handleSend = async () => {
    if (!emailData.sendTo) {
      toast.error("Please enter a recipient email address");
      return;
    }

    setIsSending(true);
    try {
      if (!id) {
        toast.error("Invalid ID");
        return;
      }
      const sendMethod = entityType === "vendor" ? vendorsAPI.sendStatement : customersAPI.sendStatement;
      const response = await sendMethod(id, {
        to: emailData.sendTo,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        body: editorRef.current?.innerHTML || emailData.body,
        attachments: {
          statement: true,
          startDate,
          endDate,
          filterBy
        }
      });

      if (response.success) {
        toast.success("Statement email sent successfully!");
        navigate(entityType === "vendor" ? `/purchases/vendors/${id}` : `/sales/customers/${id}`);
      } else {
        toast.error(`Failed to send email: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending statement:", error);
      toast.error("An error occurred while sending the email.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    navigate(entityType === "vendor" ? `/purchases/vendors/${id}` : `/sales/customers/${id}`);
  };

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || undefined);
    if (editorRef.current) {
      setEmailData(prev => ({ ...prev, body: editorRef.current?.innerHTML || "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const displayName = customer?.displayName || customer?.name || (entityType === "vendor" ? "Vendor" : "Customer");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <X
            size={24}
            className="text-gray-500 cursor-pointer hover:bg-gray-100 rounded-full p-1"
            onClick={handleCancel}
          />
          <h1 className="text-xl font-semibold text-gray-900">
            Email Statement to {displayName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-md text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className={`px-4 py-2 bg-red-600 text-white font-medium rounded-md text-sm hover:bg-red-700 transition-colors flex items-center gap-2 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Email Metadata */}
        <div className="space-y-4 mb-8">
          {/* From */}
          <div className="flex items-center gap-4 py-1 border-b border-gray-100">
            <label className="w-20 text-sm font-medium text-gray-500">From</label>
            <div className="flex-1 text-sm font-medium text-gray-900 flex items-center justify-between">
              {emailData.from}
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>

          {/* Send To */}
          <div className="flex items-start gap-4 py-2 border-b border-gray-100">
            <label className="w-20 text-sm font-medium text-gray-500 mt-2">Send To</label>
            <div className="flex-1 relative">
              <input
                type="text"
                value={emailData.sendTo}
                onChange={(e) => setEmailData({ ...emailData, sendTo: e.target.value })}
                className="w-full text-sm py-2 bg-transparent outline-none focus:ring-0 text-gray-900"
                placeholder="Add recipients..."
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-4 py-1 border-b border-gray-100">
              <label className="w-20 text-sm font-medium text-gray-500">Cc</label>
              <div className="flex-1 flex items-center justify-between">
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                  className="w-full text-sm py-1 bg-transparent outline-none text-gray-900"
                />
                <X size={14} className="text-gray-400 cursor-pointer" onClick={() => setShowCc(false)} />
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center gap-4 py-1 border-b border-gray-100">
              <label className="w-20 text-sm font-medium text-gray-500">Bcc</label>
              <div className="flex-1 flex items-center justify-between">
                <input
                  type="text"
                  value={emailData.bcc}
                  onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                  className="w-full text-sm py-1 bg-transparent outline-none text-gray-900"
                />
                <X size={14} className="text-gray-400 cursor-pointer" onClick={() => setShowBcc(false)} />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-4 py-1 border-b border-gray-100">
            <label className="w-20 text-sm font-medium text-gray-500">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="flex-1 text-sm font-medium text-gray-900 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Editor Toolbar */}
        <div className="flex items-center gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg flex-wrap">
          <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-200 rounded transition-colors" title="Bold"><Bold size={16} /></button>
          <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-200 rounded transition-colors" title="Italic"><Italic size={16} /></button>
          <button onClick={() => execCommand('underline')} className="p-2 hover:bg-gray-200 rounded transition-colors" title="Underline"><Underline size={16} /></button>
          <button onClick={() => execCommand('strikeThrough')} className="p-2 hover:bg-gray-200 rounded transition-colors" title="Strikethrough"><Strikethrough size={16} /></button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <Type size={14} className="text-gray-500" />
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                execCommand('fontSize', e.target.value);
              }}
              className="bg-transparent text-xs outline-none cursor-pointer font-medium"
            >
              <option value="3">Small</option>
              <option value="4">Normal</option>
              <option value="5">Large</option>
              <option value="6">Huge</option>
            </select>
          </div>

          <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded transition-colors"><AlignLeft size={16} /></button>
          <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded transition-colors"><AlignCenter size={16} /></button>
          <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded transition-colors"><AlignRight size={16} /></button>
          <button onClick={() => execCommand('justifyFull')} className="p-2 hover:bg-gray-200 rounded transition-colors"><AlignJustify size={16} /></button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button className="p-2 hover:bg-gray-200 rounded transition-colors"><LinkIcon size={16} /></button>
          <button className="p-2 hover:bg-gray-200 rounded transition-colors"><ImageIcon size={16} /></button>
        </div>

        {/* Content Editable Body */}
        <div
          ref={editorRef}
          contentEditable
          className="w-full min-h-[350px] p-6 border border-t-0 border-gray-200 rounded-b-lg outline-none text-gray-800 text-sm prose max-w-none"
          onInput={(e) => setEmailData(prev => ({ ...prev, body: e.currentTarget.innerHTML }))}
          suppressContentEditableWarning={true}
        />

        {/* Attachments Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Attachments</h2>
            <Info size={14} className="text-gray-400 cursor-help" />
          </div>

          <div className="space-y-3">
            {/* Customer Statement Block */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between group hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-2 rounded">
                  <FileText className="text-red-600" size={24} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 uppercase">Statement of {displayName}</div>
                  <div className="text-xs text-gray-500 font-medium">From {formatDate(startDate)} to {formatDate(endDate)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors">
                  <Eye size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Other Attachments Link */}
            <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-2">
              <Paperclip size={16} />
              <span>Attach more files...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
