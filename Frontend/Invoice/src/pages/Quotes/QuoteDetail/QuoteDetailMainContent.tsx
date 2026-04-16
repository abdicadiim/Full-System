import React, { useState } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, Edit, ExternalLink, FileText, FolderPlus, Loader2, Mail, Menu, MessageSquare, MoreHorizontal, MoreVertical, Paperclip, Settings, Share2, Trash2, Upload, X, XCircle } from "lucide-react";
import QuoteDetailLinkedInvoicesTable from "./QuoteDetailLinkedInvoicesTable";
import QuoteDetailPdfDocument from "./QuoteDetailPdfDocument";
import { formatCurrency, formatDate, getInitial, getStatusBadge } from "./QuoteDetail.utils";

type Props = {
  quote: any;
  selectedQuotes?: any[];
  statusSuccessMessage?: string;
  activeTab: string;
  setActiveTab: (value: string) => void;
  showPdfView: boolean;
  setShowPdfView: (value: boolean) => void;
  showMailDropdown: boolean;
  setShowMailDropdown: (value: boolean) => void;
  showPdfDropdown: boolean;
  setShowPdfDropdown: (value: boolean) => void;
  showMoreDropdown: boolean;
  setShowMoreDropdown: (value: boolean) => void;
  showConvertDropdown: boolean;
  setShowConvertDropdown: (value: boolean) => void;
  setShowMobileSidebar: (value: boolean) => void;
  setShowAttachmentsModal: (value: boolean) => void;
  setShowCommentsSidebar: (value: boolean) => void;
  handleClose: () => void;
  handleEdit: () => void;
  handleSendEmail: () => void;
  handleShare: () => void;
  handleDownloadPDF: () => void;
  handleConvertToInvoice: () => void;
  handleConvertToDraft: () => void;
  handleCreateProject: () => void;
  handleMarkAsAccepted: () => void;
  handleMarkAsDeclined: () => void;
  handleMarkCurrentAsSent: () => void;
  handleQuotePreferences: () => void;
  handleDeleteQuote: () => void;
  handleCopyQuoteLink: () => void;
  linkedInvoices: any[];
  linkedInvoicesLoading: boolean;
  quoteTotalsMeta: any;
  organizationProfile: any;
  ownerEmail: any;
  activityLogs: any[];
  isQuoteDocumentHovered: boolean;
  setIsQuoteDocumentHovered: (value: boolean) => void;
  isCustomizeDropdownOpen: boolean;
  setIsCustomizeDropdownOpen: (value: boolean) => void;
  quoteAttachments: any[];
  isUploadingAttachment: boolean;
  attachmentsFileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleFileUpload: (files: any[]) => void;
  handleRemoveAttachment: (id: any) => void;
};

const QuoteDetailMainContent = (props: Props) => {
  const {
    quote,
    selectedQuotes = [],
    statusSuccessMessage,
    activeTab,
    setActiveTab,
    showPdfView,
    setShowPdfView,
    showMailDropdown,
    setShowMailDropdown,
    showPdfDropdown,
    setShowPdfDropdown,
    showMoreDropdown,
    setShowMoreDropdown,
    showConvertDropdown,
    setShowConvertDropdown,
    setShowMobileSidebar,
    setShowCommentsSidebar,
    handleClose,
    handleEdit,
    handleSendEmail,
    handleShare,
    handleDownloadPDF,
    handleConvertToInvoice,
    handleConvertToDraft,
    handleCreateProject,
    handleMarkAsAccepted,
    handleMarkAsDeclined,
    handleMarkCurrentAsSent,
    handleQuotePreferences,
    handleDeleteQuote,
    handleCopyQuoteLink,
    linkedInvoices,
    linkedInvoicesLoading,
    quoteTotalsMeta,
    organizationProfile,
    ownerEmail,
    activityLogs,
    isQuoteDocumentHovered,
    setIsQuoteDocumentHovered,
    isCustomizeDropdownOpen,
    setIsCustomizeDropdownOpen,
    quoteAttachments,
    isUploadingAttachment,
    attachmentsFileInputRef,
    handleFileUpload,
    handleRemoveAttachment,
  } = props;

  const formatQuoteAddressSnapshot = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address.trim();

    const attention = String(address?.attention || "").trim();
    const street1 = String(address?.street1 || "").trim();
    const street2 = String(address?.street2 || "").trim();
    const city = String(address?.city || "").trim();
    const state = String(address?.state || "").trim();
    const zipCode = String(address?.zipCode || "").trim();
    const country = String(address?.country || "").trim();
    const cityStateZip = [city, state, zipCode].filter(Boolean).join(", ");

    return [attention, street1, street2, cityStateZip, country].filter(Boolean).join(", ");
  };

  const billingAddressDisplay = formatQuoteAddressSnapshot(quote.billingAddress || quote.customer?.billingAddress);
  const shippingAddressDisplay = formatQuoteAddressSnapshot(quote.shippingAddress || quote.customer?.shippingAddress);

  const quoteStatus = String(quote?.status || "").toLowerCase();
  const isInvoicedStatus = quoteStatus === "invoiced" || quoteStatus === "converted";
  const isApprovedStatus = quoteStatus === "approved";
  const isDraftStatus = quoteStatus === "draft";
  const isSentStatus = quoteStatus === "sent" || quoteStatus === "send";
  const isAcceptedStatus = quoteStatus === "accepted";
  const isDeclinedStatus = quoteStatus === "declined" || quoteStatus === "rejected";
  const isSimplifiedActionStatus = quoteStatus === "accepted" || isInvoicedStatus;
  const [showAttachmentsPopover, setShowAttachmentsPopover] = useState(false);
  const [attachmentMenuIndex, setAttachmentMenuIndex] = useState<number | null>(null);
  const [attachmentDeleteConfirmIndex, setAttachmentDeleteConfirmIndex] = useState<number | null>(null);
  const attachments = Array.isArray(quoteAttachments) ? quoteAttachments : [];

  const formatFileSize = (bytes: number | string) => {
    const size = Number(bytes) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  };

  const isPdfAttachment = (fileName: string) => /\.pdf$/i.test(fileName || "");

  const handleDownloadAttachment = (file: any) => {
    const url = file?.url || (file?.file ? URL.createObjectURL(file.file) : "");
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!file?.url && file?.file) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenAttachmentInNewTab = (file: any) => {
    const url = file?.url || (file?.file ? URL.createObjectURL(file.file) : "");
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    if (!file?.url && file?.file) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRequestRemoveAttachment = (index: number) => {
    setAttachmentMenuIndex(index);
    setAttachmentDeleteConfirmIndex(index);
  };

  const handleCancelRemoveAttachment = () => {
    setAttachmentMenuIndex(null);
    setAttachmentDeleteConfirmIndex(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {statusSuccessMessage && (
        <div className="px-4 md:px-6 pt-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle size={15} />
            <span>{statusSuccessMessage}</span>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between px-4 h-[74px] border-b border-gray-200 bg-white ${selectedQuotes.length > 0 ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="md:hidden p-2 text-gray-600" onClick={() => setShowMobileSidebar(true)}>
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <div className="text-sm text-gray-600 truncate">Location: <span className="text-[#2F80FF]">{quote.selectedLocation || quote.location || "Head Office"}</span></div>
            <h1 className="text-lg md:text-[24px] leading-tight font-semibold text-gray-900 truncate">{quote.quoteNumber || quote.id}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowAttachmentsPopover((prev) => !prev);
                setShowCommentsSidebar(false);
              }}
              className="h-8 min-w-8 rounded border border-gray-200 bg-white px-2 cursor-pointer flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50"
              aria-label="Attachments"
              title="Attachments"
            >
              <Paperclip size={14} strokeWidth={2} />
              <span className="text-[12px] font-medium leading-none">{attachments.length}</span>
            </button>
            {showAttachmentsPopover && (
              <div className="absolute right-0 top-full mt-2 w-[286px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-[220]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h3 className="text-[15px] font-semibold text-slate-900">Attachments</h3>
                  <button
                    type="button"
                    onClick={() => setShowAttachmentsPopover(false)}
                    className="h-6 w-6 rounded text-red-500 flex items-center justify-center hover:bg-red-50"
                    aria-label="Close attachments"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="px-4 py-4">
                  {attachments.length === 0 ? (
                    <div className="py-3 text-center text-[14px] text-slate-700">No Files Attached</div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={file.id || `${file.name}-${index}`}>
                          <div
                            className={`group relative cursor-pointer rounded-md px-3 py-2 pr-16 text-[13px] transition-colors ${
                              attachmentMenuIndex === index
                                ? "w-full bg-[#eef2ff] hover:bg-[#e5e7eb]"
                                : "w-full bg-white hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${isPdfAttachment(file.name) ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"}`}>
                                <FileText size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] text-slate-700">{file.name}</div>
                                <div className="text-[12px] text-slate-500">File Size: {formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRequestRemoveAttachment(index)}
                              className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-1 text-red-500 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                              aria-label="Remove attachment"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttachmentMenuIndex((current) => (current === index ? null : index))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Attachment actions"
                              title="More"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {attachmentMenuIndex === index && (
                              <div className="mt-2 flex items-center gap-5 px-8 text-[12px] font-medium text-blue-600">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDownloadAttachment(file);
                                    setAttachmentMenuIndex(null);
                                  }}
                                  className="hover:text-blue-700"
                                >
                                  Download
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestRemoveAttachment(index)}
                                  className="hover:text-blue-700"
                                >
                                  Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAttachmentInNewTab(file)}
                                  className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                  aria-label="Open attachment"
                                  title="Open"
                                >
                                  <ExternalLink size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    {isUploadingAttachment ? (
                      <div className="flex h-[58px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-400">
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#156372] px-4 py-3 text-[14px] font-semibold text-white shadow-sm hover:opacity-95">
                        <Upload size={16} />
                        <span>Upload your Files</span>
                        <input
                          ref={attachmentsFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              void handleFileUpload(files);
                            }
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    )}
                    <p className="mt-2 text-[11px] text-slate-500">You can upload a maximum of 5 files, 10MB each</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="p-2 text-gray-600" onClick={() => { setShowCommentsSidebar(true); setShowAttachmentsPopover(false); }} title="Comments">
            <MessageSquare size={18} />
          </button>
          <button className="p-2 text-gray-600" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2 md:p-3 border-b border-gray-200 bg-[#f8fafc]">
        {!isSimplifiedActionStatus && (
          <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={handleEdit}>
            <Edit size={16} />
            <span>Edit</span>
          </button>
        )}

        <div className="relative quote-detail-dropdown-wrapper">
          <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={() => { setShowMailDropdown(!showMailDropdown); setShowPdfDropdown(false); setShowMoreDropdown(false); setShowConvertDropdown(false); }}>
            <Mail size={16} />
            <span>Mails</span>
            <ChevronDown size={14} />
          </button>
          {showMailDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
              <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleSendEmail}>Send Quote Email</div>
            </div>
          )}
        </div>

        <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={handleShare}><Share2 size={16} /><span>Share</span></button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          onClick={handleDownloadPDF}
          aria-label="Download PDF"
          title="Download PDF"
        >
          <Download size={16} />
        </button>

        {(isDraftStatus || isSentStatus || isAcceptedStatus) && <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={handleConvertToInvoice}><FileText size={16} /><span>Convert to Invoice</span></button>}
        {isInvoicedStatus && <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={handleConvertToInvoice}><FileText size={16} /><span>Convert to Invoice</span></button>}

        {isApprovedStatus && (
          <div className="relative quote-detail-dropdown-wrapper">
            <button className="flex items-center gap-1.5 px-2 py-1.5 text-gray-700" onClick={() => { setShowConvertDropdown(!showConvertDropdown); setShowMailDropdown(false); setShowPdfDropdown(false); setShowMoreDropdown(false); }}>
              <span>Convert</span><ChevronDown size={14} />
            </button>
            {showConvertDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[210px] p-1.5">
                <button type="button" onClick={() => { setShowConvertDropdown(false); handleConvertToInvoice(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-white bg-[#2F80FF] shadow-sm"><FileText size={14} />Convert to Invoice</button>
                <button type="button" onClick={handleConvertToDraft} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-50 mt-1"><FileText size={14} />Convert to Draft</button>
              </div>
            )}
          </div>
        )}

        <div className="relative quote-detail-dropdown-wrapper">
          <button className="p-1.5 text-gray-700" onClick={() => { setShowMoreDropdown(!showMoreDropdown); setShowMailDropdown(false); setShowPdfDropdown(false); setShowConvertDropdown(false); }}>
            <MoreHorizontal size={16} />
          </button>
          {showMoreDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px] overflow-hidden">
              {isDeclinedStatus && (<><div className="px-4 py-2 text-sm cursor-pointer text-gray-700" onClick={handleMarkAsAccepted}>Mark as Accepted</div><div className="h-px bg-gray-100" /></>)}
              {(isSentStatus || isAcceptedStatus) && (<><div className="px-4 py-2 text-sm cursor-pointer text-gray-700" onClick={handleCreateProject}>Create Project</div><div className="h-px bg-gray-100" /></>)}
              {!isSimplifiedActionStatus && !isApprovedStatus && isSentStatus && (<><div className="px-4 py-2 text-sm cursor-pointer text-gray-700" onClick={handleMarkAsAccepted}>Mark as Accepted</div><div className="h-px bg-gray-100" /><div className="px-4 py-2 text-sm text-gray-700 cursor-pointer" onClick={handleMarkAsDeclined}>Mark as Declined</div><div className="h-px bg-gray-100" /></>)}
              {(isApprovedStatus || isDraftStatus) && (<><div className="px-4 py-2 text-sm cursor-pointer text-gray-700" onClick={() => { setShowMoreDropdown(false); handleMarkCurrentAsSent(); }}>Mark As Sent</div><div className="h-px bg-gray-100" /></>)}
              <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer" onClick={handleQuotePreferences}><Settings size={14} className="inline mr-2" />Quote Preferences</div>
              <div className="h-px bg-gray-100" />
              <div className="px-4 py-2 text-sm text-red-600 cursor-pointer" onClick={handleDeleteQuote}><XCircle size={14} className="inline mr-2" />Delete</div>
              <div className="h-px bg-gray-100" />
              <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer" onClick={handleCopyQuoteLink}>Copy Link</div>
            </div>
          )}
        </div>
      </div>

      {isApprovedStatus && (
        <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="mb-3 text-sm text-gray-700 flex items-center flex-wrap gap-2">
            <span>Approved by:</span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white text-xs font-semibold">A</span>
            <span className="font-medium text-gray-900">{String((quote as any)?.approvedByName || (quote as any)?.approvedBy || "Admin")}</span>
            <span className="text-gray-400">•</span>
            <button type="button" className="text-[#2563eb] hover:underline">View Approval Details</button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 mb-4">
            <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
            <span className="text-sm text-gray-600">This quote has been approved. You can now email it to your customer or simply mark it as sent.</span>
            <button type="button" className="px-4 py-1.5 bg-[#1b5e6a] text-white rounded-md text-sm font-semibold hover:bg-[#0f4a56]" onClick={handleSendEmail}>Send Quote</button>
            <button type="button" className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={handleMarkCurrentAsSent}>Mark As Sent</button>
          </div>
        </div>
      )}
      {attachmentDeleteConfirmIndex !== null && (
        <div
          className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 px-4 pt-4"
          onClick={handleCancelRemoveAttachment}
        >
          <div
            className="w-full max-w-[520px] overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle size={18} />
              </div>
              <p className="text-[14px] leading-6 text-slate-700">
                This action will permanently delete the attachment. Are you sure you want to proceed?
              </p>
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (attachmentDeleteConfirmIndex !== null) {
                      const attachment = attachments[attachmentDeleteConfirmIndex];
                      if (attachment?.id) {
                        void handleRemoveAttachment(attachment.id);
                      }
                    }
                    handleCancelRemoveAttachment();
                  }}
                  className="rounded-md bg-blue-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-blue-600"
                >
                  Proceed
                </button>
                <button
                  type="button"
                  onClick={handleCancelRemoveAttachment}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDraftStatus && (
        <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
            <span className="text-sm text-gray-600">Go ahead and email this quote to your customer or simply mark it as sent.</span>
            <button type="button" className="px-4 py-1.5 bg-[#1b5e6a] text-white rounded-md text-sm font-semibold hover:bg-[#0f4a56]" onClick={handleSendEmail}>Send Quote</button>
            <button type="button" className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={handleMarkCurrentAsSent}>Mark As Sent</button>
          </div>
        </div>
      )}
      {isInvoicedStatus && (
        <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
            <span className="text-sm text-gray-600">This quote has been invoiced. You can review the invoice details or create a project.</span>
            <button type="button" className="px-4 py-1.5 bg-[#1b5e6a] text-white rounded-md text-sm font-semibold hover:bg-[#0f4a56]" onClick={handleConvertToInvoice}>Convert to Invoice</button>
            <button type="button" className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={handleCreateProject}>Create Project</button>
          </div>
        </div>
      )}
      {(isSentStatus || isAcceptedStatus) && (
        <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
            <span className="text-sm text-gray-600">Create an invoice for this quote to collect payment from your customer.</span>
            <button type="button" className="px-4 py-1.5 bg-[#1b5e6a] text-white rounded-md text-sm font-semibold hover:bg-[#0f4a56]" onClick={handleConvertToInvoice}>Convert to Invoice</button>
            <button type="button" className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={handleCreateProject}>Create Project</button>
          </div>
        </div>
      )}

      <div className="hidden">
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "details" ? "text-gray-900 border-[#3b82f6]" : "text-gray-600 border-transparent"}`} onClick={() => setActiveTab("details")}>Quote Details</button>
          {isInvoicedStatus && <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "invoices" ? "text-gray-900 border-[#3b82f6]" : "text-gray-600 border-transparent"}`} onClick={() => setActiveTab("invoices")}>Invoices</button>}
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "activity" ? "text-gray-900 border-[#3b82f6]" : "text-gray-600 border-transparent"}`} onClick={() => setActiveTab("activity")}>Activity Logs</button>
        </div>
        <div className="flex items-center gap-1 mt-2 md:mt-0">
          <button type="button" onClick={() => setShowPdfView(false)} className={`px-4 py-1.5 text-xs rounded-md border ${!showPdfView ? "bg-[#f1f5f9] border-gray-200 text-gray-700" : "bg-white border-gray-200 text-gray-500"}`}>Details</button>
          <button type="button" onClick={() => setShowPdfView(true)} className={`px-4 py-1.5 text-xs rounded-md border ${showPdfView ? "bg-white border-gray-300 text-gray-900" : "bg-white border-gray-200 text-gray-500"}`}>PDF</button>
        </div>
      </div>

      {activeTab === "details" && (
        <div className="flex-1 p-2 md:p-3 bg-gray-50 overflow-y-auto">
          {(showPdfView && (quoteStatus === "invoiced" || quoteStatus === "converted" || linkedInvoicesLoading || linkedInvoices.length > 0)) && (
            <div className="w-full mb-3">
              <QuoteDetailLinkedInvoicesTable
                quote={quote}
                linkedInvoices={linkedInvoices}
                linkedInvoicesLoading={linkedInvoicesLoading}
                compact
                onConvertToInvoice={handleConvertToInvoice}
                onNavigateToInvoice={(invoiceId) => invoiceId && window.location.assign(`/sales/invoices/${invoiceId}`)}
              />
            </div>
          )}

          {showPdfView ? (
            <QuoteDetailPdfDocument
              quote={quote}
              quoteTotalsMeta={quoteTotalsMeta}
              organizationProfile={organizationProfile}
              ownerEmail={ownerEmail}
              setIsQuoteDocumentHovered={setIsQuoteDocumentHovered}
              setIsCustomizeDropdownOpen={setIsCustomizeDropdownOpen}
            />
          ) : (
            <div className="w-full max-w-[920px] mx-auto bg-white border border-gray-200 rounded-md p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">{quote.quoteNumber || quote.id}{getStatusBadge(quote.status)}</h2>
                <p className="text-sm text-gray-600">Total : <span className="text-lg font-semibold text-gray-900">{formatCurrency(quote.total, quote.currency)}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Quote Number</div><div className="text-sm text-gray-900">{quote.quoteNumber || quote.id}</div></div>
                <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Quote Date</div><div className="text-sm text-gray-900">{formatDate(quote.quoteDate)}</div></div>
                <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Salesperson</div><div className="text-sm text-gray-900">{quote.salesperson || "-"}</div></div>
                <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Expiry Date</div><div className="text-sm text-gray-900">{formatDate(quote.expiryDate)}</div></div>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Name</div><div className="text-sm text-gray-900">{quote.customerName || "-"}</div></div>
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Billing Address</div><div className="text-sm text-gray-900">{billingAddressDisplay || "-"}</div></div>
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Shipping Address</div><div className="text-sm text-gray-900">{shippingAddressDisplay || "-"}</div></div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Items <span className="ml-2 text-xs text-gray-600">{quote.items?.length || 0}</span></h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50"><th className="p-3 text-left">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Amount</th></tr></thead>
                    <tbody>
                      {quote.items?.length ? quote.items.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-t">
                          <td className="p-3">{item.name || item.item?.name || "N/A"}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unitPrice || item.rate || item.price, quote.currency)}</td>
                          <td className="p-3 text-right">{formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price)), quote.currency)}</td>
                        </tr>
                      )) : <tr><td className="p-4 text-center text-gray-500" colSpan={4}>No items added</td></tr>}
                    </tbody>
                  </table>
                </div>
              <div className="flex flex-col items-end gap-2 mt-4">
                <div className="flex justify-between w-64 text-sm"><span>Sub Total</span><span>{formatCurrency(quoteTotalsMeta.subTotal, quote.currency)}</span></div>
                <div className="flex justify-between w-64 text-sm">
                  <span>{quoteTotalsMeta.taxLabel}</span>
                  <span>{formatCurrency(quoteTotalsMeta.taxAmount, quote.currency)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span>Shipping charge</span>
                  <span>{formatCurrency(quoteTotalsMeta.shippingCharges, quote.currency)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span>{quoteTotalsMeta.shippingTaxLabel}</span>
                  <span>{formatCurrency(quoteTotalsMeta.shippingTaxAmount, quote.currency)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span>Adjustment</span>
                  <span>{formatCurrency(quoteTotalsMeta.adjustment, quote.currency)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span>Round Off</span>
                  <span>{formatCurrency(quoteTotalsMeta.roundOff, quote.currency)}</span>
                </div>
                <div className="text-xs text-gray-500 w-64">({quoteTotalsMeta.taxExclusive})</div>
                <div className="flex justify-between w-64 text-sm font-semibold bg-gray-100 px-3 py-2 rounded"><span>Total</span><span>{formatCurrency(quoteTotalsMeta.total, quote.currency)}</span></div>
              </div>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{quote.customerNotes || "Looking forward for your business."}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Terms and Conditions</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{quote.termsAndConditions || "No Terms and Conditions"}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
          <QuoteDetailLinkedInvoicesTable
            quote={quote}
            linkedInvoices={linkedInvoices}
            linkedInvoicesLoading={linkedInvoicesLoading}
            onConvertToInvoice={handleConvertToInvoice}
            onNavigateToInvoice={(invoiceId) => invoiceId && window.location.assign(`/sales/invoices/${invoiceId}`)}
          />
        </div>
      )}

      {activeTab === "retainerInvoices" && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
          <div className="w-full max-w-4xl mx-auto bg-white shadow-lg border border-gray-200 rounded-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Retainer Invoices</h3>
            <p className="text-sm text-gray-600">No retainer invoices found for this quote.</p>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="flex-1 overflow-y-auto p-6">
          {activityLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
              <Clock size={48} />
              <p>No activity logs yet</p>
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">Activity Logs</div>
              <div className="divide-y divide-gray-100">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">{log.action}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{log.description}</div>
                    <div className="text-xs text-gray-500 mt-1">By {log.actor}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuoteDetailMainContent;
