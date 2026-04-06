import { toast } from "react-toastify";
import { documentsAPI } from "../../../services/api";
import { getCurrentUserDisplayName, isImageFileAttachment } from "./QuoteDetail.utils";

export const useQuoteDetailAttachmentActions = (ctx: any) => {
  const {
    quote,
    quoteId,
    attachmentsFileInputRef,
    quoteAttachments,
    setQuoteAttachments,
    setQuote,
    isUploadingAttachment,
    setIsUploadingAttachment,
    isDragging,
    setIsDragging,
    selectedImage,
    setSelectedImage,
    setShowImageViewer,
    newComment,
    setNewComment,
    comments,
    setComments,
    commentBold,
    setCommentBold,
    commentItalic,
    setCommentItalic,
    commentUnderline,
    setCommentUnderline,
    isSavingComment,
    setIsSavingComment,
    appendActivityLog,
    updateQuoteDep,
    normalizeAttachmentFromQuote,
    normalizeCommentFromQuote,
  } = ctx;

  const handleFileUpload = async (files: any[]) => {
    if (!quoteId || !quote) {
      toast.error("Please save the quote first, then upload files.");
      return;
    }

    const validFiles = Array.from(files as ArrayLike<File>).filter((file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (quoteAttachments.length + validFiles.length > 5) {
      toast.error("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const uploadedAttachments: any[] = [];

      for (const file of validFiles) {
        const uploadResponse = await documentsAPI.upload(file, {
          name: file.name,
          type: "quote",
          module: "sales",
          relatedToType: "quote",
          relatedToId: quote.id || quote._id || quoteId,
          description: `Quote attachment for ${quote.quoteNumber || quote.id || quoteId}`,
        });

        const uploadedDocument = uploadResponse?.data || {};
        const fileUrl = uploadedDocument.url || "";
        const attachment = normalizeAttachmentFromQuote({
          id: uploadedDocument._id || uploadedDocument.id || Date.now() + Math.random(),
          documentId: uploadedDocument._id || uploadedDocument.id,
          name: uploadedDocument.name || file.name,
          size: uploadedDocument.fileSize || file.size,
          type: uploadedDocument.mimeType || file.type,
          mimeType: uploadedDocument.mimeType || file.type,
          url: fileUrl,
          preview: (uploadedDocument.mimeType || file.type || "").startsWith("image/") ? fileUrl : null,
          uploadedAt: uploadedDocument.createdAt || new Date().toISOString(),
        }, uploadedAttachments.length);

        uploadedAttachments.push(attachment);
      }

      const updatedAttachments = [...quoteAttachments, ...uploadedAttachments];
      setQuoteAttachments(updatedAttachments);
      localStorage.setItem(`quote_attachments_${quoteId}`, JSON.stringify(updatedAttachments));

      const attachedFilesPayload = updatedAttachments
        .filter((attachment) => attachment.url)
        .map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: Number(attachment.size || 0),
          mimeType: attachment.type || attachment.mimeType || "",
          documentId: attachment.documentId || "",
          uploadedAt: attachment.uploadedAt || new Date().toISOString(),
        }));

      const updatedQuote = await updateQuoteDep(quoteId, { attachedFiles: attachedFilesPayload });
      setQuote(updatedQuote);
      await appendActivityLog("Attachment Added", `${uploadedAttachments.length} attachment(s) uploaded.`, "success");
      toast.success(`${uploadedAttachments.length} attachment(s) uploaded.`);
    } catch (error) {
      console.error("Error uploading quote attachment:", error);
      toast.error("Failed to upload attachment. Please try again.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleFileClick = (attachment: any) => {
    const isImage = isImageFileAttachment(attachment);
    if (isImage) {
      setSelectedImage(attachment.preview || attachment.url || (attachment.file ? URL.createObjectURL(attachment.file) : null));
      setShowImageViewer(true);
    } else if (attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    } else if (attachment.file) {
      const url = URL.createObjectURL(attachment.file);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleRemoveAttachment = async (id: any) => {
    if (!quoteId) return;

    const updatedAttachments = quoteAttachments.filter((att: any) => att.id !== id);
    setQuoteAttachments(updatedAttachments);
    localStorage.setItem(`quote_attachments_${quoteId}`, JSON.stringify(updatedAttachments));

    try {
      const attachedFilesPayload = updatedAttachments
        .filter((attachment) => attachment.url)
        .map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: Number(attachment.size || 0),
          mimeType: attachment.type || attachment.mimeType || "",
          documentId: attachment.documentId || "",
          uploadedAt: attachment.uploadedAt || new Date().toISOString(),
        }));

      const updatedQuote = await updateQuoteDep(quoteId, { attachedFiles: attachedFilesPayload });
      setQuote(updatedQuote);
      await appendActivityLog("Attachment Removed", "An attachment was removed.", "warning");
      toast.success("Attachment removed.");
    } catch (error) {
      console.error("Error removing quote attachment:", error);
      toast.error("Failed to remove attachment from database. Please refresh and try again.");
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      void handleFileUpload(files);
    }
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: any) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!quoteId) {
      toast.error("Please save the quote first, then add comments.");
      return;
    }

    const comment = {
      id: `${Date.now()}-${Math.random()}`,
      text: newComment.trim(),
      author: getCurrentUserDisplayName(),
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline,
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
    localStorage.setItem(`quote_comments_${quoteId}`, JSON.stringify(updatedComments));

    setIsSavingComment(true);
    try {
      const commentsPayload = updatedComments.map((entry: any) => ({
        id: entry.id,
        text: entry.text,
        author: entry.author || "User",
        timestamp: entry.timestamp,
        bold: Boolean(entry.bold),
        italic: Boolean(entry.italic),
        underline: Boolean(entry.underline),
      }));
      const updatedQuote = await updateQuoteDep(quoteId, { comments: commentsPayload });
      setQuote(updatedQuote);
      const normalizedComments = Array.isArray(updatedQuote?.comments)
        ? updatedQuote.comments.map((entry: any, index: number) => normalizeCommentFromQuote(entry, index))
        : updatedComments;
      setComments(normalizedComments);
      localStorage.setItem(`quote_comments_${quoteId}`, JSON.stringify(normalizedComments));
      await appendActivityLog("Comment Added", "A new comment was added.", "info");
      toast.success("Comment added.");
    } catch (error) {
      console.error("Error saving quote comment:", error);
      toast.error("Failed to save comment. Please try again.");
    } finally {
      setIsSavingComment(false);
    }
  };

  return {
    handleFileUpload,
    handleFileClick,
    handleRemoveAttachment,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleAddComment,
  };
};

