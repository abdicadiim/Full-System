import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type CommentItem = {
  id: string;
  text?: string;
  content?: string;
  createdAt: string;
};

type CommentsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  storageKey: string;
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

export default function CommentsDrawer({ isOpen, onClose, storageKey }: CommentsDrawerProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [draft, setDraft] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setComments(readComments(storageKey));
  }, [isOpen, storageKey]);

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

  const addComment = () => {
    const plainText = editorRef.current?.innerText.trim() || "";
    if (!plainText) return;
    const content = sanitizeCommentHtml(editorRef.current?.innerHTML || "");
    const next: CommentItem = {
      id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = [next, ...comments];
    setComments(updated);
    writeComments(storageKey, updated);
    setDraft("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
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
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#3b82f6] text-[#ef4444] hover:bg-[#f8fafc]"
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
                disabled={!draft.trim() || !(editorRef.current?.innerText.trim() || "")}
                className="rounded border border-[#cfd5e3] bg-white px-3 py-1 text-[13px] text-[#334155] disabled:opacity-50"
              >
                Add Comment
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
                  {comments.map((item) => (
                    <div key={item.id} className="rounded border border-[#e3e7f2] p-3">
                      <div
                        className="text-[13px] text-[#111827]"
                        dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(item.content || item.text || "") }}
                      />
                      <p className="mt-1 text-[11px] text-[#64748b]">
                        {new Date(item.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
