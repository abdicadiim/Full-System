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
  author: string;
  timestamp: string;
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
    <div className="flex-1 min-h-0 overflow-y-auto bg-white p-6">
      <div className="mb-8 w-full max-w-[720px] overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex gap-5 border-b border-slate-200 bg-white px-4 py-2.5">
          <button
            type="button"
            className={`flex cursor-pointer items-center justify-center rounded-[6px] border p-1.5 transition-all ${isBold ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("bold")}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className={`flex cursor-pointer items-center justify-center rounded-[6px] border p-1.5 transition-all ${isItalic ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("italic")}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            className={`flex cursor-pointer items-center justify-center rounded-[6px] border p-1.5 transition-all ${isUnderline ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommentFormat("underline")}
            title="Underline"
          >
            <Underline size={14} />
          </button>
        </div>
        <div className="p-0">
          <div className="relative">
            {isEditorEmpty && (
              <div className="pointer-events-none absolute left-4 top-3 text-[13px] text-slate-400">
                Add a comment...
              </div>
            )}
            <div
              ref={editorRef}
              id="comment-textarea"
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              className="min-h-[124px] w-full whitespace-pre-wrap border-none px-4 py-3 text-[14px] leading-relaxed text-slate-700 outline-none"
              onInput={syncEditorState}
              onMouseUp={syncEditorState}
              onKeyUp={syncEditorState}
              onFocus={syncEditorState}
              style={{ textAlign: "left", direction: "ltr" }}
            />
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAddComment}
            disabled={isSaving || isEditorEmpty}
          >
            {isSaving ? "Saving..." : "Add Comment"}
          </button>
        </div>
      </div>

      <div className="w-full max-w-[720px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <h3 className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700">ALL COMMENTS</h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[11px] font-bold leading-none text-white">
              {localComments.length}
            </span>
          </div>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>

        {localComments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm italic text-slate-500">No comments yet.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-16">
            {localComments.map((comment) => (
              <div key={comment.id} className="group flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 shadow-sm">
                  {getCommentAuthorInitial(comment)}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 text-[12px]">
                    <span className="font-semibold text-slate-900">{getCommentAuthorName(comment)}</span>
                    <span className="text-[#94a3b8]">•</span>
                    <span className="text-slate-500">{formatCommentDate(comment.createdAt || comment.timestamp || "")}</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex-1 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700"
                        dangerouslySetInnerHTML={{ __html: commentMarkupToHtml(comment.content || comment.text || "") }}
                      />
                      <button
                        type="button"
                        className="mt-0.5 cursor-pointer rounded-full border-none bg-transparent p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
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
