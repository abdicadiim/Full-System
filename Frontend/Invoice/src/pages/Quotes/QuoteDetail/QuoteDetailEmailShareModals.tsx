import React from "react";
import { ChevronDown, FileText, HelpCircle, Paperclip, X } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  quote: any;
  showEmailModal: boolean;
  setShowEmailModal: (value: boolean) => void;
  showEmailDetails: boolean;
  setShowEmailDetails: (value: boolean) => void;
  emailData: any;
  setEmailData: (value: any) => void;
  showCc: boolean;
  setShowCc: (value: boolean) => void;
  showBcc: boolean;
  setShowBcc: (value: boolean) => void;
  attachments: any[];
  setAttachments: (value: any[]) => void;
  attachQuotePDF: boolean;
  setAttachQuotePDF: (value: boolean) => void;
  fontSize: string;
  setFontSize: (value: string) => void;
  isBold: boolean;
  setIsBold: (value: boolean) => void;
  isItalic: boolean;
  setIsItalic: (value: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (value: boolean) => void;
  isStrikethrough: boolean;
  setIsStrikethrough: (value: boolean) => void;
  emailModalRef: any;
  fileInputRef: any;
  organizationProfile: any;
  ownerEmail: any;
  showShareModal: boolean;
  setShowShareModal: (value: boolean) => void;
  shareVisibility: string;
  setShareVisibility: (value: string) => void;
  isVisibilityDropdownOpen: boolean;
  setIsVisibilityDropdownOpen: (value: boolean) => void;
  linkExpirationDate: string;
  setLinkExpirationDate: (value: string) => void;
  generatedLink: string;
  setGeneratedLink: (value: string) => void;
  isLinkGenerated: boolean;
  setIsLinkGenerated: (value: boolean) => void;
  shareModalRef: any;
  visibilityDropdownRef: any;
  handleGenerateLink: () => void;
  handleCopyLink: () => void;
  handleDisableAllActiveLinks: () => void;
};

const QuoteDetailEmailShareModals = (props: Props) => {
  const {
    quote,
    showEmailModal,
    setShowEmailModal,
    showEmailDetails,
    setShowEmailDetails,
    emailData,
    setEmailData,
    showCc,
    setShowCc,
    showBcc,
    setShowBcc,
    attachments,
    setAttachments,
    attachQuotePDF,
    setAttachQuotePDF,
    fontSize,
    setFontSize,
    isBold,
    setIsBold,
    isItalic,
    setIsItalic,
    isUnderline,
    setIsUnderline,
    isStrikethrough,
    setIsStrikethrough,
    emailModalRef,
    fileInputRef,
    organizationProfile,
    ownerEmail,
    showShareModal,
    setShowShareModal,
    shareVisibility,
    setShareVisibility,
    isVisibilityDropdownOpen,
    setIsVisibilityDropdownOpen,
    linkExpirationDate,
    setLinkExpirationDate,
    generatedLink,
    isLinkGenerated,
    setIsLinkGenerated,
    shareModalRef,
    visibilityDropdownRef,
    handleGenerateLink,
    handleCopyLink,
    handleDisableAllActiveLinks,
  } = props;

  return (
    <>
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setShowEmailModal(false)}>
          <div ref={emailModalRef} className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Email Quote</h2>
              <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900" onClick={() => setShowEmailModal(false)}><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" value={emailData.sendTo} onChange={(e) => setEmailData({ ...emailData, sendTo: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <button className="text-sm text-blue-600" onClick={() => setShowCc(!showCc)}>Cc</button>
                  <button className="text-sm text-blue-600" onClick={() => setShowBcc(!showBcc)}>Bcc</button>
                </div>
                {showCc && <input className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" value={emailData.cc} onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })} placeholder="Cc recipients" />}
                {showBcc && <input className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" value={emailData.bcc} onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })} placeholder="Bcc recipients" />}
              </div>

              <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md flex-wrap">
                <select className="border border-gray-300 rounded bg-white px-2 py-1 text-sm" value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                  <option value="12">12 px</option>
                  <option value="14">14 px</option>
                  <option value="16">16 px</option>
                  <option value="18">18 px</option>
                  <option value="20">20 px</option>
                </select>
                <button type="button" className={`px-2 py-1 text-sm border rounded ${isBold ? "bg-gray-200" : "bg-white"}`} onClick={() => setIsBold(!isBold)}>B</button>
                <button type="button" className={`px-2 py-1 text-sm border rounded ${isItalic ? "bg-gray-200" : "bg-white"}`} onClick={() => setIsItalic(!isItalic)}>I</button>
                <button type="button" className={`px-2 py-1 text-sm border rounded ${isUnderline ? "bg-gray-200" : "bg-white"}`} onClick={() => setIsUnderline(!isUnderline)}>U</button>
                <button type="button" className={`px-2 py-1 text-sm border rounded ${isStrikethrough ? "bg-gray-200" : "bg-white"}`} onClick={() => setIsStrikethrough(!isStrikethrough)}>S</button>
              </div>

              <div className="min-h-[280px] p-4 border border-gray-300 rounded-md text-sm outline-none bg-white" contentEditable suppressContentEditableWarning onInput={(e: any) => setEmailData({ ...emailData, body: e.target.textContent })} style={{ fontWeight: isBold ? "bold" : "normal", fontStyle: isItalic ? "italic" : "normal", textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none", fontSize: `${fontSize}px` }}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                    {organizationProfile?.logo ? <img src={organizationProfile.logo} alt="Company Logo" className="w-full h-full object-contain rounded" /> : (organizationProfile?.name?.substring(0, 2).toUpperCase() || "TB")}
                  </div>
                </div>
                <div className="bg-blue-600 text-white p-4 rounded text-center font-semibold mb-4">Quote #{quote.quoteNumber || quote.id}</div>
                <div className="mb-4">
                  <p>Dear {quote.customerName || "Customer"},</p>
                  <p className="mt-3">Thank you for contacting us. Your quote can be viewed, printed and downloaded as PDF from the link below.</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded p-4 text-center mb-4">
                  <div className="text-sm font-semibold text-gray-900 mb-2">QUOTE AMOUNT</div>
                  <div className="text-2xl font-bold text-red-600 mb-2">{quote.total}</div>
                  <div className="border-t border-orange-200 pt-3 mt-3 text-left text-sm text-gray-900">
                    <div>Quote No <strong>{quote.quoteNumber || quote.id}</strong></div>
                    <div>Quote Date <strong>{quote.quoteDate || quote.date || "-"}</strong></div>
                  </div>
                </div>
                <div className="mt-4">
                  <p>Regards,</p>
                  <p className="font-semibold">{ownerEmail?.name || organizationProfile?.name || "Team"}</p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input type="checkbox" checked={attachQuotePDF} onChange={(e) => setAttachQuotePDF(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Attach Quote PDF</span>
                </label>
                {attachQuotePDF && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white mb-4">
                    <FileText size={16} className="text-gray-500" />
                    <span className="flex-1 text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>
                  </div>
                )}
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md mb-2 bg-gray-50">
                    <FileText size={16} className="text-gray-500" />
                    <span className="flex-1 text-sm text-gray-900">{attachment.name}</span>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== index))} className="p-1 text-gray-500"> <X size={16} /> </button>
                  </div>
                ))}
                <button className="flex items-center gap-2 text-sm text-blue-600" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={16} />
                  Attachments
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); setAttachments([...attachments, ...files.map((file: any) => ({ name: file.name, type: file.type, file }))]); }} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onClick={() => {
                  if (!emailData.sendTo) {
                    toast.error("Please enter a recipient email address.");
                    return;
                  }
                  toast.success("Email sent successfully.");
                  setShowEmailModal(false);
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && quote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div ref={shareModalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Share Quote Link</h2>
              <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900" onClick={() => setShowShareModal(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility:</label>
                <div className="relative" ref={visibilityDropdownRef}>
                  <button className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-red-600 hover:bg-gray-50" onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}>
                    <span className="font-medium">{shareVisibility}</span><ChevronDown size={16} className="text-red-600" />
                  </button>
                  {isVisibilityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50" onClick={() => { setShareVisibility("Public"); setIsVisibilityDropdownOpen(false); }}>Public</div>
                      <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => { setShareVisibility("Private"); setIsVisibilityDropdownOpen(false); }}>Private</div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">Select an expiration date and generate the link to share it with your customer.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-red-600 mb-2">Link Expiration Date<span className="text-red-600">*</span></label>
                <input type="text" value={linkExpirationDate} onChange={(e) => setLinkExpirationDate(e.target.value)} placeholder="DD/MM/YYYY" className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-600"><HelpCircle size={14} className="text-gray-500" /><span>By default, the link is set to expire 90 days from the quote expiry date.</span></div>
              </div>
              {isLinkGenerated && generatedLink && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generated Link:</label>
                  <textarea readOnly value={generatedLink} className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none" rows={3} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <div>{isLinkGenerated && <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={handleCopyLink}>Copy Link</button>}</div>
              <div className="flex items-center gap-3">
                {!isLinkGenerated ? (
                  <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={handleGenerateLink}>Generate Link</button>
                ) : (
                  <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={handleDisableAllActiveLinks}>Disable All Active Links</button>
                )}
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setShowShareModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteDetailEmailShareModals;
