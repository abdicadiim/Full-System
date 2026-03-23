/* eslint-disable @typescript-eslint/no-explicit-any */

const DOC_KEY = "taban_documents_v1";

const readDocs = () => {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDocs = (docs: any[]) => {
  localStorage.setItem(DOC_KEY, JSON.stringify(docs));
};

const toSizeLabel = (size: number) => {
  if (!size || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const emit = (eventName: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventName));
};

export const getAllDocuments = (options?: { module?: string }) => {
  const docs = readDocs();

  // Most callers want "all documents across the system". When a module is passed,
  // we try a best-effort filter but fall back to returning everything.
  const moduleName = options?.module;
  if (!moduleName || moduleName === "Documents") return docs;

  const filtered = docs.filter((d: any) => {
    if (!d || typeof d !== "object") return false;
    return (
      d.module === moduleName ||
      d.sourceModule === moduleName ||
      d.associatedTo === moduleName ||
      d.source === moduleName
    );
  });

  return filtered.length ? filtered : docs;
};

export const addDocument = async (fileOrDoc: any, meta: Record<string, any> = {}) => {
  const docs = readDocs();
  const now = new Date().toISOString();

  const fromFile =
    fileOrDoc &&
    typeof File !== "undefined" &&
    fileOrDoc instanceof File;

  const created = fromFile
    ? {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: fileOrDoc.name || "Document",
        size: toSizeLabel(Number(fileOrDoc.size || 0)),
        type: (fileOrDoc.name?.split(".").pop() || "").toLowerCase(),
        uploadedAt: now,
        uploadedOn: new Date().toLocaleDateString(),
        uploadedBy: "Me",
        file: fileOrDoc,
        ...meta,
      }
    : {
        id: fileOrDoc?.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: fileOrDoc?.name || "Document",
        uploadedAt: fileOrDoc?.uploadedAt || now,
        uploadedOn: fileOrDoc?.uploadedOn || new Date().toLocaleDateString(),
        uploadedBy: fileOrDoc?.uploadedBy || "Me",
        ...fileOrDoc,
        ...meta,
      };

  docs.unshift(created);
  writeDocs(docs);
  emit("documentAdded");
  return created;
};

export const addMultipleDocuments = async (filesOrDocs: any[] = [], meta: Record<string, any> = {}) => {
  const created: any[] = [];
  for (const item of filesOrDocs) {
    // eslint-disable-next-line no-await-in-loop
    created.push(await addDocument(item, meta));
  }
  return created;
};

export const deleteDocument = async (id: string) => {
  if (!id) return { success: false };
  const docs = readDocs();
  const next = docs.filter((d: any) => d?.id !== id);
  writeDocs(next);
  emit("documentDeleted");
  return { success: true };
};

export const updateDocument = async (id: string, patch: Record<string, any> = {}) => {
  if (!id) return { success: false };
  const docs = readDocs();
  const idx = docs.findIndex((d: any) => d?.id === id);
  if (idx < 0) return { success: false };

  docs[idx] = { ...(docs[idx] || {}), ...(patch || {}) };
  writeDocs(docs);
  emit("documentUpdated");
  return { success: true, data: docs[idx] };
};

export const refreshDocuments = async (options?: { module?: string }) => {
  // Placeholder for future server sync; today it's just local storage.
  return getAllDocuments(options);
};
