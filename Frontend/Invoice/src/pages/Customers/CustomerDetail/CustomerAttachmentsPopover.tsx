import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type CustomerAttachment = {
  id: string | number;
  name?: string;
  size?: string | number;
  url?: string;
};

type CustomerAttachmentsPopoverProps = {
  open: boolean;
  onClose: () => void;
  attachments?: CustomerAttachment[];
  isUploading?: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  onRemoveAttachment: (attachmentId: number) => Promise<void> | void;
};

const formatAttachmentSize = (size: string | number | undefined) => {
  if (typeof size === "number" && Number.isFinite(size) && size > 0) {
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(size) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((size / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  const label = String(size || "").trim();
  return label || "Unknown";
};

const isPdfAttachment = (name?: string) => String(name || "").toLowerCase().endsWith(".pdf");

const resolveAttachmentUrl = (rawUrl?: string) => {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (/^(blob:|data:|https?:\/\/)/i.test(url)) return url;
  if (url.startsWith("//")) return `${window.location.protocol}${url}`;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
};

const triggerDownload = (href: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function CustomerAttachmentsPopover({
  open,
  onClose,
  attachments = [],
  isUploading = false,
  onUpload,
  onRemoveAttachment,
}: CustomerAttachmentsPopoverProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentMenuIndex, setAttachmentMenuIndex] = useState<number | null>(null);
  const [attachmentDeleteConfirmIndex, setAttachmentDeleteConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setAttachmentMenuIndex(null);
      setAttachmentDeleteConfirmIndex(null);
    }
  }, [open]);

  if (!open) return null;

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await onUpload(event);
    if (event.currentTarget) {
      event.currentTarget.value = "";
    }
  };

  const handleDownloadAttachment = (file: CustomerAttachment) => {
    const resolvedUrl = resolveAttachmentUrl(file?.url);
    if (!resolvedUrl) return;

    triggerDownload(resolvedUrl, String(file?.name || "attachment"));
  };

  const handleOpenAttachmentInNewTab = (file: CustomerAttachment) => {
    const resolvedUrl = resolveAttachmentUrl(file?.url);
    if (!resolvedUrl) return;

    const openedWindow = window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    if (!openedWindow) {
      const link = document.createElement("a");
      link.href = resolvedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRequestRemoveAttachment = (index: number) => {
    setAttachmentMenuIndex(index);
    setAttachmentDeleteConfirmIndex(index);
  };

  const handleCancelRemoveAttachment = () => {
    setAttachmentDeleteConfirmIndex(null);
  };

  return (
    <>
      <div className="absolute top-full right-0 mt-2 w-[286px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-[220]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-slate-900">Attachments</h3>
          <button
            type="button"
            onClick={onClose}
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
                <div key={`${file.id}-${index}`}>
                  <div
                    className={`group relative cursor-pointer rounded-md px-3 py-2 pr-16 text-[13px] transition-colors ${
                      attachmentMenuIndex === index
                        ? "w-full bg-[#eef2ff] hover:bg-[#e5e7eb]"
                        : "w-full bg-white hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${
                          isPdfAttachment(file.name) ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        <FileText size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-slate-700">{file.name}</div>
                        <div className="text-[12px] text-slate-500">File Size: {formatAttachmentSize(file.size)}</div>
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
                          className="flex items-center gap-1 hover:text-blue-700"
                        >
                          <Download size={13} />
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
                          onClick={() => {
                            handleOpenAttachmentInNewTab(file);
                            setAttachmentMenuIndex(null);
                          }}
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
            {isUploading ? (
              <div className="flex h-[58px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-400">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span>Uploading...</span>
              </div>
            ) : (
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#156372] px-4 py-3 text-[14px] font-semibold text-white shadow-sm hover:opacity-95">
                <Upload size={16} />
                <span>Upload your Files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUploadChange}
                />
              </label>
            )}
            <p className="mt-2 text-[11px] text-slate-500">You can upload a maximum of 10 files, 10MB each</p>
          </div>
        </div>
      </div>

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
                      void onRemoveAttachment(attachmentDeleteConfirmIndex + 1);
                    }
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
    </>
  );
}
