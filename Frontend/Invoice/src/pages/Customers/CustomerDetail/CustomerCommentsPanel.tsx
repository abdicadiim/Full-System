import React, { useEffect, useRef, useState } from "react";
import { Bold, Italic, Trash2, Underline } from "lucide-react";
import { toast } from "react-toastify";
import { customersAPI } from "../../../services/api";
import { AUTH_USER_UPDATED_EVENT, getCurrentUser } from "../../../services/auth";

export type CustomerComment = {
  id: string | number;
  text: string;
  content: string;
  authorName: string;
  authorInitial: string;
  createdAt: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  author?: string;
  timestamp?: string;
};

type CustomerCommentsPanelProps = {
  customerId: string;
  comments?: any[];
  onCommentsChange?: (comments: CustomerComment[]) => void;
};

const sanitizeCommentHtml = (html: string) => {
  if (!html) return "";
  if (typeof document === "undefined") return String(html);

  const container = document.createElement("div");
  container.innerHTML = html;
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "DIV", "P", "SPAN"]);

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const element = node as HTMLElement;
    if (!allowedTags.has(element.tagName)) {
      const text = document.createTextNode(element.textContent || "");
      element.parentNode?.replaceChild(text, element);
      return;
    }

    while (element.attributes.length > 0) {
      element.removeAttribute(element.attributes[0].name);
    }

    Array.from(element.childNodes).forEach(sanitizeNode);
  };

  Array.from(container.childNodes).forEach(sanitizeNode);
  return container.innerHTML;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const commentMarkupToHtml = (value: string) => {
  const raw = String(value || "");
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeCommentHtml(raw);

  let result = "";
  let i = 0;
  let boldOpen = false;
  let italicOpen = false;
  let underlineOpen = false;

  while (i < raw.length) {
    const twoCharToken = raw.slice(i, i + 2);
    if (twoCharToken === "**") {
      result += boldOpen ? "</strong>" : "<strong>";
      boldOpen = !boldOpen;
      i += 2;
      continue;
    }
    if (twoCharToken === "__") {
      result += underlineOpen ? "</u>" : "<u>";
      underlineOpen = !underlineOpen;
      i += 2;
      continue;
    }
    if (raw[i] === "*") {
      result += italicOpen ? "</em>" : "<em>";
      italicOpen = !italicOpen;
      i += 1;
      continue;
    }

    const char = raw[i];
    result += char === "\n" ? "<br />" : escapeHtml(char);
    i += 1;
  }

  if (italicOpen) result += "</em>";
  if (underlineOpen) result += "</u>";
  if (boldOpen) result += "</strong>";
  return result;
};

const commentMarkupToText = (value: string) => {
  const raw = String(value || "");
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    if (typeof document === "undefined") return raw.replace(/<[^>]*>/g, "");
    const container = document.createElement("div");
    container.innerHTML = sanitizeCommentHtml(raw);
    return container.textContent || "";
  }

  let result = "";
  let i = 0;
  while (i < raw.length) {
    const twoCharToken = raw.slice(i, i + 2);
    if (twoCharToken === "**" || twoCharToken === "__") {
      i += 2;
      continue;
    }
    if (raw[i] === "*") {
      i += 1;
      continue;
    }
    result += raw[i];
    i += 1;
  }
  return result;
};

const getLoggedInUserDisplay = () => {
  const currentUser = getCurrentUser();
  const name = String(
    currentUser?.name ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.username ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
      currentUser?.email ||
      "You"
  ).trim() || "You";

  return {
    name,
    initial: name.charAt(0).toUpperCase() || "Y",
  };
};

const normalizeComment = (comment: any, index = 0): CustomerComment | null => {
  if (!comment || typeof comment !== "object") return null;
  const id = String(comment.id || comment._id || `cm-${index}-${Date.now()}`).trim();
  if (!id) return null;

  const rawContent = String(comment.content ?? "").trim();
  const legacyText = String(comment.text ?? "").trim();
  const authorName = String(comment.authorName || comment.author || "You").trim() || "You";
  const createdAt = String(comment.createdAt || comment.timestamp || new Date().toISOString()).trim() || new Date().toISOString();
  const content = rawContent || sanitizeCommentHtml(legacyText || "");

  return {
    id,
    text: legacyText || commentMarkupToText(content),
    content,
    authorName,
    authorInitial: String(comment.authorInitial || authorName.charAt(0).toUpperCase() || "Y").trim() || "Y",
    createdAt,
    bold: Boolean(comment.bold),
    italic: Boolean(comment.italic),
    underline: Boolean(comment.underline),
    author: String(comment.author || authorName).trim() || "You",
    timestamp: createdAt,
  };
};

const normalizeComments = (comments: any): CustomerComment[] =>
  Array.isArray(comments)
    ? comments.map((comment, index) => normalizeComment(comment, index)).filter(Boolean) as CustomerComment[]
    : [];

export default function CustomerCommentsPanel({
  customerId,
  comments = [],
  onCommentsChange,
}: CustomerCommentsPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentUserDisplay, setCurrentUserDisplay] = useState(getLoggedInUserDisplay());
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localComments, setLocalComments] = useState<CustomerComment[]>(normalizeComments(comments));

  useEffect(() => {
    setLocalComments(normalizeComments(comments));
  }, [comments]);

  useEffect(() => {
    const syncCurrentUser = () => setCurrentUserDisplay(getLoggedInUserDisplay());
    syncCurrentUser();
    window.addEventListener("storage", syncCurrentUser);
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncCurrentUser as EventListener);
    return () => {
      window.removeEventListener("storage", syncCurrentUser);
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncCurrentUser as EventListener);
    };
  }, []);

  const getCommentAuthorName = (comment: any) => {
    const authorName = String(comment?.authorName || "").trim();
    const authorInitial = String(comment?.authorInitial || "").trim();
    if (!authorName || authorName === "You" || authorInitial === "Y") return currentUserDisplay.name;
    return authorName;
  };

  const getCommentAuthorInitial = (comment: any) => {
    const authorName = String(comment?.authorName || "").trim();
    const authorInitial = String(comment?.authorInitial || "").trim();
    if (!authorName || authorName === "You" || authorInitial === "Y") return currentUserDisplay.initial;
    return authorInitial || authorName.charAt(0).toUpperCase() || "Y";
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsEditorEmpty(!editor.innerText.trim());

    try {
      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));
    } catch {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
    }
  };

  const applyCommentFormat = (command: "bold" | "italic" | "underline") => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    syncEditorState();
  };

  const handleAddComment = async () => {
    const editor = editorRef.current;
    const trimmedComment = editor?.innerText.trim() || "";
    if (!trimmedComment || !customerId) return;

    const createdAt = new Date().toISOString();
    const author = currentUserDisplay;
    const previousComments = localComments;
    const newComment: CustomerComment = {
      id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: trimmedComment,
      content: sanitizeCommentHtml(editor?.innerHTML || ""),
      authorName: author.name,
      authorInitial: author.initial,
      createdAt,
      bold: false,
      italic: false,
      underline: false,
      author: author.name,
      timestamp: createdAt,
    };

    const updatedComments = [newComment, ...previousComments];
    setLocalComments(updatedComments);
    setIsSaving(true);

    try {
      const response = await customersAPI.update(customerId, { comments: updatedComments });
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to save customer comments");
      }

      const savedComments = normalizeComments(response?.data?.comments ?? updatedComments);
      setLocalComments(savedComments);
      onCommentsChange?.(savedComments);

      if (editor) {
        editor.innerHTML = "";
      }
      setIsEditorEmpty(true);
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      toast.success("Comment added successfully.");
    } catch (error: any) {
      setLocalComments(previousComments);
      toast.error("Failed to save comment: " + (error?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!customerId) return;

    const previousComments = localComments;
    const updatedComments = previousComments.filter((comment) => String(comment.id) !== String(commentId));
    setLocalComments(updatedComments);
    setIsSaving(true);

    try {
      const response = await customersAPI.update(customerId, { comments: updatedComments });
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to delete customer comment");
      }

      const savedComments = normalizeComments(response?.data?.comments ?? updatedComments);
      setLocalComments(savedComments);
      onCommentsChange?.(savedComments);
      toast.success("Comment deleted successfully.");
    } catch (error: any) {
      setLocalComments(previousComments);
      toast.error("Failed to delete comment: " + (error?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const formatCommentDate = (value: string) =>
    new Date(String(value || new Date().toISOString())).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex-1 min-h-0 bg-white p-8 overflow-y-auto">
      <div className="mb-10 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm max-w-5xl mx-auto">
        <div className="flex gap-4 p-3 bg-gray-50/80 border-b border-gray-200">
          <button
            type="button"
            className={`p-1.5 rounded-[7px] cursor-pointer transition-all flex items-center justify-center ${isBold ? "text-gray-800 bg-white border border-[#cfd5e3] shadow-sm" : "text-gray-500 border border-transparent hover:bg-gray-100"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("bold")}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded-[7px] cursor-pointer transition-all flex items-center justify-center ${isItalic ? "text-gray-800 bg-white border border-[#cfd5e3] shadow-sm" : "text-gray-500 border border-transparent hover:bg-gray-100"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("italic")}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded-[7px] cursor-pointer transition-all flex items-center justify-center ${isUnderline ? "text-gray-800 bg-white border border-[#cfd5e3] shadow-sm" : "text-gray-500 border border-transparent hover:bg-gray-100"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("underline")}
            title="Underline"
          >
            <Underline size={15} />
          </button>
        </div>
        <div className="p-0">
          <div className="relative">
            {isEditorEmpty && (
              <div className="pointer-events-none absolute left-5 top-4 text-sm text-gray-400">
                Add a comment...
              </div>
            )}
            <div
              ref={editorRef}
              id="comment-textarea"
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              className="min-h-40 w-full px-5 py-4 text-sm text-gray-700 outline-none whitespace-pre-wrap leading-relaxed border-none"
              onInput={syncEditorState}
              onMouseUp={syncEditorState}
              onKeyUp={syncEditorState}
              onFocus={syncEditorState}
              style={{ textAlign: "left", direction: "ltr" }}
            />
          </div>
        </div>
        <div className="border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            className="px-5 py-2 bg-[#156372] text-white rounded text-[13px] font-bold cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm border-none disabled:opacity-60"
            onClick={handleAddComment}
            disabled={isSaving || isEditorEmpty}
          >
            {isSaving ? "Saving..." : "Add Comment"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">ALL COMMENTS</h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {localComments.length}
            </span>
          </div>
          <div className="h-px w-full bg-gray-100"></div>
        </div>

        {localComments.length === 0 ? (
          <div className="text-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400 font-medium italic">No comments yet.</p>
          </div>
        ) : (
          <div className="space-y-5 pb-20 pr-6">
            {localComments.map((comment) => (
              <div key={comment.id} className="group flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-[#cfdaf0] bg-white text-[11px] font-semibold text-[#6b7a90] flex items-center justify-center shadow-sm">
                  {getCommentAuthorInitial(comment)}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 text-[12px]">
                    <span className="font-semibold text-[#111827]">{getCommentAuthorName(comment)}</span>
                    <span className="text-[#94a3b8]">•</span>
                    <span className="text-[#64748b]">{formatCommentDate(comment.createdAt || comment.timestamp || "")}</span>
                  </div>
                  <div className="rounded-lg bg-[#f8fafc] px-4 py-3 shadow-sm border border-[#eef2f7]">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="text-[15px] leading-relaxed text-[#156372] whitespace-pre-wrap font-semibold flex-1"
                        dangerouslySetInnerHTML={{ __html: commentMarkupToHtml(comment.content || comment.text || "") }}
                      />
                      <button
                        type="button"
                        className="mt-0.5 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer border-none bg-transparent opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
