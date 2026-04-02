import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Strikethrough,
  Underline,
  X,
} from "lucide-react";

export default function InvoiceCommunicationModals(props: any) {
  const {
    invoice,
    ownerEmail,
    organizationProfile,
    isSendEmailModalOpen,
    setIsSendEmailModalOpen,
    emailData,
    setEmailData,
    handleSendEmailSubmit,
    isScheduleEmailModalOpen,
    setIsScheduleEmailModalOpen,
    scheduleData,
    setScheduleData,
    handleScheduleEmailSubmit,
    showShareModal,
    setShowShareModal,
  } = props;

  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);

  const visibilityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showShareModal || !invoice) return;

    const defaultExpiryDate = invoice?.dueDate ? new Date(invoice.dueDate) : new Date();
    defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);

    const day = String(defaultExpiryDate.getDate()).padStart(2, "0");
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, "0");
    const year = defaultExpiryDate.getFullYear();

    setLinkExpirationDate(`${day}/${month}/${year}`);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShareVisibility("Public");
    setIsVisibilityDropdownOpen(false);
  }, [showShareModal, invoice]);

  useEffect(() => {
    if (!showShareModal || !isVisibilityDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        visibilityDropdownRef.current &&
        !visibilityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsVisibilityDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShareModal, isVisibilityDropdownOpen]);

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      toast("Please select an expiration date");
      return;
    }

    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const invoiceId = invoice?.id || invoice?.invoiceNumber || Date.now();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    setGeneratedLink(`${baseUrl}?CInvoiceID=${invoiceId}-${token}`);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;

    navigator.clipboard
      .writeText(generatedLink)
      .then(() => {
        toast("Link copied to clipboard!");
      })
      .catch(() => {
        toast(`Unable to copy link. Please copy manually: ${generatedLink}`);
      });
  };

  const handleDisableAllActiveLinks = () => {
    if (!window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      return;
    }

    setGeneratedLink("");
    setIsLinkGenerated(false);
    toast("All active links have been disabled.");
  };

  return (
    <>
      {isSendEmailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsSendEmailModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Email To {invoice?.customerName || invoice?.customer || "Customer"}
              </h2>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => setIsSendEmailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex mb-4">
                <div className="w-24 pt-2 text-right pr-4">
                  <label className="text-sm text-gray-500 font-medium flex items-center justify-end gap-1">
                    From <HelpCircle size={14} className="text-gray-400" />
                  </label>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-700 py-2">
                    {ownerEmail?.name || organizationProfile?.name || "Team"} &lt;
                    {ownerEmail?.email || organizationProfile?.email || ""}&gt;
                  </div>
                </div>
              </div>

              <div className="flex mb-4">
                <div className="w-24 pt-2 text-right pr-4">
                  <label className="text-sm text-gray-500 font-medium">Send To</label>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 p-1.5 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400">
                    {emailData.to && (
                      <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded text-xs font-bold text-gray-600 uppercase">
                          {emailData.to.charAt(0)}
                        </span>
                        <span>{emailData.to}</span>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 ml-1"
                          onClick={() => setEmailData((prev: any) => ({ ...prev, to: "" }))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <input
                      type="email"
                      className="flex-1 min-w-[150px] outline-none text-sm text-gray-700 py-1"
                      value={emailData.to ? "" : emailData.to}
                      onChange={(event) =>
                        setEmailData((prev: any) => ({ ...prev, to: event.target.value }))
                      }
                      placeholder={emailData.to ? "" : "Enter email address"}
                    />
                    <div className="ml-auto flex items-center gap-3 pr-2">
                      {!emailData.cc && (
                        <button
                          className="text-blue-500 text-sm hover:underline cursor-pointer"
                          onClick={() => setEmailData((prev: any) => ({ ...prev, cc: " " }))}
                        >
                          Cc
                        </button>
                      )}
                      {!emailData.bcc && (
                        <button
                          className="text-blue-500 text-sm hover:underline cursor-pointer"
                          onClick={() => setEmailData((prev: any) => ({ ...prev, bcc: " " }))}
                        >
                          Bcc
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {emailData.cc !== undefined && (
                <div className="flex mb-4">
                  <div className="w-24 pt-2 text-right pr-4">
                    <label className="text-sm text-gray-500 font-medium">Cc</label>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={emailData.cc.trim()}
                      onChange={(event) =>
                        setEmailData((prev: any) => ({ ...prev, cc: event.target.value }))
                      }
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setEmailData((prev: any) => ({ ...prev, cc: undefined }))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {emailData.bcc !== undefined && (
                <div className="flex mb-4">
                  <div className="w-24 pt-2 text-right pr-4">
                    <label className="text-sm text-gray-500 font-medium">Bcc</label>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={emailData.bcc.trim()}
                      onChange={(event) =>
                        setEmailData((prev: any) => ({ ...prev, bcc: event.target.value }))
                      }
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setEmailData((prev: any) => ({ ...prev, bcc: undefined }))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex mb-6">
                <div className="w-24 pt-2 text-right pr-4">
                  <label className="text-sm text-gray-500 font-medium">Subject</label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm text-gray-800 font-medium"
                    value={emailData.subject}
                    onChange={(event) =>
                      setEmailData((prev: any) => ({ ...prev, subject: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-t-md border-b-0 flex-wrap">
                  <button
                    type="button"
                    className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${
                      isBold ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setIsBold((prev) => !prev)}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${
                      isItalic ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setIsItalic((prev) => !prev)}
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${
                      isUnderline ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setIsUnderline((prev) => !prev)}
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${
                      isStrikethrough ? "bg-gray-200" : ""
                    }`}
                    onClick={() => setIsStrikethrough((prev) => !prev)}
                  >
                    <Strikethrough size={14} />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <select
                    value={fontSize}
                    onChange={(event) => setFontSize(event.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="12">12 px</option>
                    <option value="14">14 px</option>
                    <option value="16">16 px</option>
                    <option value="18">18 px</option>
                  </select>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <AlignRight size={14} />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <LinkIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <ImageIcon size={14} />
                  </button>
                </div>

                <div
                  contentEditable
                  className="min-h-[300px] p-4 border border-gray-300 rounded-b-md text-sm outline-none bg-white overflow-y-auto"
                  style={{
                    fontWeight: isBold ? "bold" : "normal",
                    fontStyle: isItalic ? "italic" : "normal",
                    textDecoration: isUnderline
                      ? "underline"
                      : isStrikethrough
                        ? "line-through"
                        : "none",
                    fontSize: `${fontSize}px`,
                  }}
                  onInput={(event) =>
                    setEmailData((prev: any) => ({
                      ...prev,
                      message: (event.target as HTMLElement).innerHTML,
                    }))
                  }
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: emailData.message }}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={16} />
                <span>Invoice PDF will be attached</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={handleSendEmailSubmit}
              >
                Send
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                onClick={() => setIsSendEmailModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isScheduleEmailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsScheduleEmailModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schedule Email</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsScheduleEmailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleData.to}
                  onChange={(event) =>
                    setScheduleData((prev: any) => ({ ...prev, to: event.target.value }))
                  }
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleData.cc}
                  onChange={(event) =>
                    setScheduleData((prev: any) => ({ ...prev, cc: event.target.value }))
                  }
                  placeholder="Enter CC email addresses (comma separated)"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleData.bcc}
                  onChange={(event) =>
                    setScheduleData((prev: any) => ({ ...prev, bcc: event.target.value }))
                  }
                  placeholder="Enter BCC email addresses (comma separated)"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleData.subject}
                  onChange={(event) =>
                    setScheduleData((prev: any) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="Enter email subject"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={scheduleData.message}
                  onChange={(event) =>
                    setScheduleData((prev: any) => ({ ...prev, message: event.target.value }))
                  }
                  placeholder="Enter email message"
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.date}
                    onChange={(event) =>
                      setScheduleData((prev: any) => ({ ...prev, date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.time}
                    onChange={(event) =>
                      setScheduleData((prev: any) => ({ ...prev, time: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <FileText size={16} />
                <span>Invoice PDF will be attached</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={handleScheduleEmailSubmit}
              >
                Schedule
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                onClick={() => setIsScheduleEmailModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && invoice && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Share Invoice Link</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                onClick={() => setShowShareModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility:
                </label>
                <div className="relative" ref={visibilityDropdownRef}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-red-600 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setIsVisibilityDropdownOpen((prev) => !prev)}
                  >
                    <span className="font-medium">{shareVisibility}</span>
                    <ChevronDown size={16} className="text-red-600" />
                  </button>
                  {isVisibilityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div
                        className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setShareVisibility("Public");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Public
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setShareVisibility("Private");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Private
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Select an expiration date and generate the link to share it with your customer.
                Remember that anyone who has access to this link can view, print or download it.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Link Expiration Date<span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={linkExpirationDate}
                  onChange={(event) => setLinkExpirationDate(event.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                  <HelpCircle size={14} className="text-gray-500" />
                  <span>
                    By default, the link is set to expire 90 days from the invoice due date.
                  </span>
                </div>
              </div>

              {isLinkGenerated && generatedLink && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Link:
                  </label>
                  <textarea
                    readOnly
                    value={generatedLink}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <div>
                {isLinkGenerated && (
                  <button
                    className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity = "1";
                    }}
                    onClick={handleCopyLink}
                  >
                    Copy Link
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!isLinkGenerated ? (
                  <button
                    className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity = "1";
                    }}
                    onClick={handleGenerateLink}
                  >
                    Generate Link
                  </button>
                ) : (
                  <button
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    onClick={handleDisableAllActiveLinks}
                  >
                    Disable All Active Links
                  </button>
                )}

                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowShareModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
