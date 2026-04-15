import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type CustomerAttachment = {
  id: string | number;
  documentId?: string;
  name?: string;
  size?: string | number;
  url?: string;
  contentUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  isPending?: boolean;
};

type CustomerAttachmentsPopoverProps = {
  open: boolean;
  onClose: () => void;
  attachments?: CustomerAttachment[];
  isUploading?: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  onRemoveAttachment: (attachmentId: string | number) => Promise<void> | void;
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

const createObjectUrlFromDataUrl = (dataUrl?: string) => {
  const url = String(dataUrl || "").trim();
  const match = url.match(/^data:([^;,]*)(;base64)?,(.*)$/i);
  if (!match) return "";

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  } catch {
    return "";
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
  const [attachmentDeleteConfirmId, setAttachmentDeleteConfirmId] = useState<string | number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<CustomerAttachment[]>([]);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);

  useEffect(() => {
    if (!open) {
      setAttachmentDeleteConfirmId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!isUploading) {
      setPendingUploads([]);
    }
  }, [isUploading]);

  if (!open) return null;

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setPendingUploads(
        files.map((file, index) => ({
          id: `pending-${Date.now()}-${index}-${file.name}`,
          documentId: `pending-${Date.now()}-${index}-${file.name}`,
          name: file.name,
          size: file.size,
          isPending: true,
        }))
      );
    }

    try {
      await onUpload(event);
    } finally {
      if (event.currentTarget) {
        event.currentTarget.value = "";
      }
    }
  };

  const visibleAttachments = [
    ...pendingUploads.filter(
      (pending) =>
        !attachments.some(
          (file) =>
            String(file.name || "").trim() === String(pending.name || "").trim() &&
            String(file.size || "").trim() === String(pending.size || "").trim()
        )
    ),
    ...attachments,
  ];

  const openAttachmentInNewTab = (file: CustomerAttachment) => {
    const resolvedUrl = resolveAttachmentUrl(file.viewUrl || file.contentUrl || file.url || file.downloadUrl);
    if (!resolvedUrl) return;

    const href = resolvedUrl.startsWith("data:") ? createObjectUrlFromDataUrl(resolvedUrl) || resolvedUrl : resolvedUrl;
    const openedWindow = window.open(href, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    if (href.startsWith("blob:")) {
      window.setTimeout(() => URL.revokeObjectURL(href), 5000);
    }
  };

  const downloadAttachment = (file: CustomerAttachment) => {
    const resolvedUrl = resolveAttachmentUrl(file.downloadUrl || file.url || file.viewUrl || file.contentUrl);
    if (!resolvedUrl) return;

    const href = resolvedUrl.startsWith("data:") ? createObjectUrlFromDataUrl(resolvedUrl) || resolvedUrl : resolvedUrl;
    triggerDownload(href, String(file.name || "attachment"));

    if (href.startsWith("blob:")) {
      window.setTimeout(() => URL.revokeObjectURL(href), 5000);
    }
  };

  const handleRequestRemoveAttachment = (attachmentId: string | number) => {
    setAttachmentDeleteConfirmId(attachmentId);
  };

  const handleCancelRemoveAttachment = () => {
    if (isDeletingAttachment) return;
    setAttachmentDeleteConfirmId(null);
  };

  const handleConfirmRemoveAttachment = async () => {
    if (attachmentDeleteConfirmId === null) return;
    setIsDeletingAttachment(true);
    try {
      await onRemoveAttachment(attachmentDeleteConfirmId);
      setAttachmentDeleteConfirmId(null);
    } finally {
      setIsDeletingAttachment(false);
    }
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
          {visibleAttachments.length === 0 ? (
            <div className="py-3 text-center text-[14px] text-slate-700">No Files Attached</div>
          ) : (
            <div className="space-y-2">
              {visibleAttachments.map((file, index) => {
                const attachmentUrl = resolveAttachmentUrl(file.viewUrl || file.contentUrl || file.url || file.downloadUrl);
                const attachmentId = file.documentId || file.id || index + 1;
                return (
                <div key={`${String(attachmentId)}-${index}`}>
                  <div
                    className="relative rounded-md bg-white px-3 py-2 text-[13px] transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${
                          isPdfAttachment(file.name) ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {file.isPending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-slate-700">{file.name}</div>
                        <div className="text-[12px] text-slate-500">
                          {file.isPending ? "Uploading..." : `File Size: ${formatAttachmentSize(file.size)}`}
                        </div>
                      </div>
                      {!file.isPending && (
                        <div className="ml-2 flex shrink-0 items-center gap-1">
                          {attachmentUrl ? (
                            <button
                              type="button"
                              onClick={() => openAttachmentInNewTab(file)}
                              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              aria-label="Open attachment"
                              title="Open"
                            >
                              <ExternalLink size={13} />
                            </button>
                          ) : null}
                          {attachmentUrl ? (
                            <button
                              type="button"
                              onClick={() => downloadAttachment(file)}
                              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              aria-label="Download attachment"
                              title="Download"
                            >
                              <Download size={13} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRequestRemoveAttachment(attachmentId)}
                            className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50"
                            aria-label="Remove attachment"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-center">
            {isUploading ? (
              <div className="flex h-[58px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-400">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span>Uploading in background...</span>
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

      {attachmentDeleteConfirmId !== null && (
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
                    void handleConfirmRemoveAttachment();
                  }}
                  disabled={isDeletingAttachment}
                  className="rounded-md bg-blue-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-70"
                >
                  {isDeletingAttachment ? "Removing..." : "Proceed"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelRemoveAttachment}
                  disabled={isDeletingAttachment}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
