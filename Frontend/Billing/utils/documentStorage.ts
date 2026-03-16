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

export const getAllDocuments = () => {
  return readDocs();
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
