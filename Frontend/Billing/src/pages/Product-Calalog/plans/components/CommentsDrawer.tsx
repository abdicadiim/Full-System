import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { plansAPI } from "../../../../services/api";
import { useUser } from "../../../../lib/auth/UserContext";

type CommentItem = {
  id: string;
  text?: string;
  content?: string;
  createdAt: string;
  authorName?: string;
  authorInitial?: string;
};

type CommentsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  storageKey: string;
  planId?: string;
  initialComments?: CommentItem[];
};

const readComments = (storageKey: string): CommentItem[] => {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeComments = (storageKey: string, comments: CommentItem[]) => {
  localStorage.setItem(storageKey, JSON.stringify(comments));
};

const sanitizeCommentHtml = (html: string) => {
  if (!html) return "";
  if (typeof document === "undefined") {
    return String(html);
  }
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

const getAuthorName = (user: any) => {
  const name =
    user?.name ||
    user?.fullName ||
    user?.displayName ||
    user?.username ||
    user?.email ||
    "User";
  return String(name).trim() || "User";
};

const getAuthorInitial = (name: string) => {
  const trimmed = String(name || "").trim();
  return trimmed.charAt(0).toUpperCase() || "U";
};

const normalizeComment = (comment: any, index = 0): CommentItem | null => {
  if (!comment || typeof comment !== "object") return null;
  const id = String(comment.id || comment._id || `cm-${index}-${Date.now()}`).trim();
  if (!id) return null;
  const content = String(comment.content ?? comment.text ?? "").trim();
  return {
    id,
    content,
    text: String(comment.text ?? comment.content ?? "").trim(),
    createdAt: String(comment.createdAt || new Date().toISOString()),
    authorName: String(comment.authorName || "").trim(),
    authorInitial: String(comment.authorInitial || "").trim(),
  };
};

const normalizeComments = (comments: any): CommentItem[] =>
  Array.isArray(comments) ? comments.map((comment, index) => normalizeComment(comment, index)).filter(Boolean) as CommentItem[] : [];

export default function CommentsDrawer({ isOpen, onClose, storageKey, planId, initialComments }: CommentsDrawerProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<CommentItem | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (planId) {
      const nextFromPlan = normalizeComments(initialComments);
      if (nextFromPlan.length > 0) {
        setComments(nextFromPlan);
        return;
      }

      const localComments = readComments(storageKey);
      setComments(localComments);
      if (localComments.length > 0) {
        void persistComments(localComments);
      }
      return;
    }
    setComments(readComments(storageKey));
  }, [isOpen, storageKey, planId, initialComments]);

  useEffect(() => {
    if (!isOpen) return;
    if (editorRef.current && editorRef.current.innerHTML !== draft) {
      editorRef.current.innerHTML = draft;
    }
  }, [draft, isOpen]);

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    setDraft(sanitizeCommentHtml(editorRef.current.innerHTML));
  };

  const persistComments = async (next: CommentItem[]) => {
    if (!planId) {
      writeComments(storageKey, next);
      return;
    }

    setSaving(true);
    try {
      const response: any = await plansAPI.update(planId, { comments: next });
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to save plan comments");
      }
      const saved = normalizeComments(response?.data?.comments);
      setComments(saved.length > 0 ? saved : next);
      window.dispatchEvent(new Event("taban:plans-updated"));
      toast.success("Plan comments saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save plan comments");
    } finally {
      setSaving(false);
    }
  };

  const addComment = () => {
    const plainText = editorRef.current?.innerText.trim() || "";
    if (!plainText) return;
    const content = sanitizeCommentHtml(editorRef.current?.innerHTML || "");
    const authorName = getAuthorName(user);
    const next: CommentItem = {
      id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      createdAt: new Date().toISOString(),
      authorName,
      authorInitial: getAuthorInitial(authorName),
    };
    const updated = [next, ...comments];
    setComments(updated);
    void persistComments(updated);
    setDraft("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const deleteComment = (id: string) => {
    const next = comments.filter((c) => c.id !== id);
    setComments(next);
    void persistComments(next);
    setCommentToDelete(null);
  };

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-[240] transition-all duration-200 ${isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
      aria-hidden={!isOpen}
    >
      <div className="pointer-events-auto h-full w-[360px] border-l border-[#d9deea] bg-white shadow-[-12px_0_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-[#e3e7f2] px-4 py-3">
          <h2 className="text-[18px] font-medium text-[#111827]">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center text-[#ef4444] hover:text-[#dc2626]"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="h-[calc(100%-61px)] overflow-y-auto p-4">
          <div className="rounded border border-[#d3d8e6]">
            <div className="flex items-center gap-3 border-b border-[#e3e7f2] bg-[#f7f8fc] px-3 py-2 text-[13px] text-[#334155]">
              <button
                type="button"
                className="font-semibold hover:text-[#111827]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("bold")}
              >
                B
              </button>
              <button
                type="button"
                className="italic hover:text-[#111827]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("italic")}
              >
                I
              </button>
              <button
                type="button"
                className="underline hover:text-[#111827]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("underline")}
              >
                U
              </button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(event) => setDraft(sanitizeCommentHtml((event.target as HTMLDivElement).innerHTML))}
              className="h-[66px] w-full overflow-y-auto whitespace-pre-wrap border-none px-3 py-2 text-[13px] text-[#111827] outline-none"
            />
            <div className="border-t border-[#e3e7f2] px-3 py-2">
              <button
                type="button"
                onClick={addComment}
                disabled={saving || !draft.trim() || !(editorRef.current?.innerText.trim() || "")}
                className="rounded border border-[#cfd5e3] bg-white px-3 py-1 text-[13px] text-[#334155] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Comment"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#334155]">All Comments</h3>
            <div className="mt-2 border-t border-[#e3e7f2] pt-5">
              {comments.length === 0 ? (
                <p className="text-center text-[14px] text-[#94a3b8]">No comments yet.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((item) => {
                    const authorName = item.authorName || getAuthorName(user);
                    const initial = item.authorInitial || getAuthorInitial(authorName);
                    return (
                      <div key={item.id} className="rounded-lg px-2">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full border border-[#e3e7f2] bg-[#f1f5f9] text-[12px] font-semibold text-[#64748b] flex items-center justify-center">
                            {initial}
                          </div>
                          <div className="flex items-center gap-2 text-[12px]">
                            <span className="font-semibold text-[#111827]">{authorName}</span>
                            <span className="text-[#94a3b8]">•</span>
                            <span className="text-[#64748b]">{new Date(item.createdAt).toLocaleString("en-GB")}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2">
                          <div
                            className="text-[13px] text-[#111827]"
                            dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(item.content || item.text || "") }}
                          />
                          <button
                            type="button"
                            onClick={() => setCommentToDelete(item)}
                            className="text-[#94a3b8] hover:text-[#64748b]"
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {commentToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-black/35 backdrop-blur-[1px]">
            <div className="absolute left-1/2 top-5 w-[460px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-md bg-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <span className="text-lg leading-none">!</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1f2937]">Do you want to delete this comment?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentToDelete(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#d1d5db] text-[#ef4444] hover:bg-[#f9fafb]"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm text-[#6b7280]">This action cannot be undone.</p>
              </div>

              <div className="border-t border-[#e5e7eb] px-5 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentToDelete(null)}
                    className="rounded border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#374151] hover:bg-[#f9fafb]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteComment(commentToDelete.id)}
                    className="rounded bg-[#0f6f7d] px-4 py-2 text-sm text-white hover:bg-[#0c5d69]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
