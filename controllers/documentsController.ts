import type express from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { StoredDocument } from "../models/StoredDocument.js";
import { findCustomerByAnyId } from "./customerIdentity.js";

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const parseDataUrl = (value: unknown) => {
  const input = String(value || "").trim();
  if (!input) return null;

  const match = input.match(/^data:([^;,]*)(;base64)?,(.*)$/i);
  if (!match) return null;

  const mimeType = String(match[1] || "application/octet-stream").trim() || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = String(match[3] || "");
  if (!payload) return null;

  let base64 = payload;
  if (!isBase64) {
    try {
      base64 = Buffer.from(decodeURIComponent(payload), "utf8").toString("base64");
    } catch {
      return null;
    }
  }

  return { mimeType, base64 };
};

const sanitizeFileName = (name: string) =>
  String(name || "attachment")
    .replace(/[\r\n"]/g, "_")
    .trim() || "attachment";

const normalizeComparableText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeComparableNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildDocumentUrls = (id: string) => ({
  url: `/api/documents/${encodeURIComponent(id)}/content`,
  viewUrl: `/api/documents/${encodeURIComponent(id)}/content`,
  downloadUrl: `/api/documents/${encodeURIComponent(id)}/download`,
});

const persistCustomerDocument = async (orgId: string, customerId: string, document: any) => {
  const customerRecord = await Customer.findOne({ _id: customerId, organizationId: orgId })
    .select({ documents: 1 })
    .lean();
  if (!customerRecord) return null;

  const currentDocuments = Array.isArray(customerRecord?.documents) ? customerRecord.documents : [];
  const nextDocumentId = String(document?.documentId || document?.id || document?._id || "").trim();
  const dedupedCurrent = currentDocuments.filter((entry: any) => {
    const entryId = String(entry?.documentId || entry?.id || entry?._id || "").trim();
    return !nextDocumentId || entryId !== nextDocumentId;
  });
  const nextDocuments = [...dedupedCurrent, document];
  await Customer.updateOne(
    { _id: customerId, organizationId: orgId },
    { $set: { documents: nextDocuments } }
  );
  return nextDocuments;
};

const normalizeDocument = (doc: any) => {
  if (!doc) return null;
  const id = String(doc._id || doc.id || doc.documentId || "").trim();
  if (!id) return null;
  const uploadedAt = String(doc.uploadedAt || doc.createdAt || new Date().toISOString()).trim() || new Date().toISOString();
  const urls = buildDocumentUrls(id);
  return {
    id,
    _id: id,
    documentId: id,
    organizationId: String(doc.organizationId || ""),
    relatedToType: String(doc.relatedToType || ""),
    relatedToId: String(doc.relatedToId || ""),
    module: String(doc.module || ""),
    type: String(doc.type || ""),
    name: String(doc.name || "attachment").trim() || "attachment",
    size: Number(doc.size || 0),
    mimeType: String(doc.mimeType || "application/octet-stream").trim() || "application/octet-stream",
    uploadedAt,
    ...urls,
    contentUrl: urls.url,
    previewUrl: urls.url,
  };
};

const documentMatchesCandidate = (
  document: any,
  options: {
    targetId?: string;
    name?: string;
    size?: number | null;
    uploadedAt?: string;
    url?: string;
  }
) => {
  const candidateIds = [
    document?.documentId,
    document?.id,
    document?._id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (options.targetId && candidateIds.includes(options.targetId)) {
    return true;
  }

  const candidateName = normalizeComparableText(document?.name);
  const requestedName = normalizeComparableText(options.name);
  const candidateSize = normalizeComparableNumber(document?.size);
  const requestedSize = normalizeComparableNumber(options.size);
  const candidateUploadedAt = String(document?.uploadedAt || document?.createdAt || "").trim();
  const requestedUploadedAt = String(options.uploadedAt || "").trim();
  const candidateUrl = normalizeComparableText(
    document?.downloadUrl || document?.viewUrl || document?.url || document?.contentUrl || document?.previewUrl
  );
  const requestedUrl = normalizeComparableText(options.url);

  if (
    requestedName &&
    candidateName &&
    requestedName === candidateName &&
    requestedSize !== null &&
    candidateSize !== null &&
    requestedSize === candidateSize
  ) {
    return true;
  }

  if (
    requestedName &&
    candidateName &&
    requestedName === candidateName &&
    requestedUploadedAt &&
    candidateUploadedAt &&
    requestedUploadedAt === candidateUploadedAt
  ) {
    return true;
  }

  if (requestedUrl && candidateUrl && requestedUrl === candidateUrl) {
    return true;
  }

  return false;
};

const syncCustomerDocuments = async (customerId: string, orgId: string) => {
  const customer = await findCustomerByAnyId(orgId, customerId);
  if (!customer) return null;
  const persistedCustomerId = String(customer._id || (customer as any)?.id || customerId).trim();

  const docs = await StoredDocument.find({ organizationId: orgId, relatedToType: "customer", relatedToId: persistedCustomerId })
    .sort({ uploadedAt: -1, createdAt: -1 })
    .lean();
  const normalized = docs.map(normalizeDocument).filter(Boolean);
  const existing = Array.isArray((customer as any).documents) ? (customer as any).documents : [];
  const storedIds = new Set(normalized.map((doc: any) => String(doc?.documentId || doc?.id || doc?._id || "").trim()).filter(Boolean));
  const preservedExisting = existing.filter((doc: any) => {
    const docId = String(doc?.documentId || doc?.id || doc?._id || "").trim();
    if (!docId) return true;
    return !storedIds.has(docId);
  });
  const merged = [...preservedExisting, ...normalized];
  await Customer.updateOne({ _id: persistedCustomerId, organizationId: orgId }, { $set: { documents: merged } });
  return merged;
};

export const listDocuments: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const filter: Record<string, unknown> = { organizationId: orgId };
    const relatedToType = asString(req.query.relatedToType).trim();
    const relatedToId = asString(req.query.relatedToId).trim();
    const module = asString(req.query.module).trim();
    const type = asString(req.query.type).trim();
    const search = asString(req.query.search ?? req.query.q).trim();

    if (relatedToType) filter.relatedToType = relatedToType;
    if (relatedToId) filter.relatedToId = relatedToId;
    if (module) filter.module = module;
    if (type) filter.type = type;
    if (search) filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const rows = await StoredDocument.find(filter).sort({ uploadedAt: -1, createdAt: -1 }).lean();
    return res.json({ success: true, data: rows.map(normalizeDocument).filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

export const getDocumentById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const doc = await StoredDocument.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Document not found", data: null });
    return res.json({ success: true, data: normalizeDocument(doc) });
  } catch (err) {
    next(err);
  }
};

const sendDocumentContent = async (req: express.Request, res: express.Response, mode: "inline" | "attachment") => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

  const doc = await StoredDocument.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!doc) return res.status(404).json({ success: false, message: "Document not found", data: null });

  const base64 = String(doc.contentBase64 || "").trim();
  if (!base64) return res.status(404).json({ success: false, message: "Document content not available", data: null });

  const buffer = Buffer.from(base64, "base64");
  const fileName = sanitizeFileName(String(doc.name || "attachment"));
  const mimeType = String(doc.mimeType || "application/octet-stream").trim() || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `${mode}; filename="${fileName}"`);
  return res.send(buffer);
};

export const viewDocumentContent: express.RequestHandler = async (req, res, next) => {
  try {
    await sendDocumentContent(req, res, "inline");
  } catch (err) {
    next(err);
  }
};

export const downloadDocumentContent: express.RequestHandler = async (req, res, next) => {
  try {
    await sendDocumentContent(req, res, "attachment");
  } catch (err) {
    next(err);
  }
};

export const uploadDocument: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const payload = (req.body || {}) as Record<string, unknown>;
    const name = String(payload.name || "attachment").trim() || "attachment";
    const relatedToType = String(payload.relatedToType || "").trim().toLowerCase();
    const relatedToId = String(payload.relatedToId || "").trim();
    const module = String(payload.module || "").trim();
    const type = String(payload.type || "").trim();
    const size = Number(payload.size || 0);
    const dataUrl = String(payload.contentUrl || payload.contentDataUrl || "").trim();
    const parsed = parseDataUrl(dataUrl);

    if (!parsed) {
      return res.status(400).json({ success: false, message: "Attachment content is required", data: null });
    }

    if (relatedToType === "customer" && relatedToId) {
      const customerRecord = await Customer.findOne({ _id: relatedToId, organizationId: orgId })
        .select({ _id: 1 })
        .lean();
      if (!customerRecord) {
        return res.status(404).json({ success: false, message: "Customer not found", data: null });
      }
    }

    const created = await StoredDocument.create({
      organizationId: orgId,
      relatedToType,
      relatedToId,
      module,
      type,
      name,
      size: Number.isFinite(size) && size > 0 ? size : Buffer.byteLength(parsed.base64, "base64"),
      mimeType: parsed.mimeType,
      contentBase64: parsed.base64,
      uploadedAt: new Date().toISOString(),
    });

    const normalized = normalizeDocument(created.toObject()) as any;
    if (relatedToType === "customer" && relatedToId) {
      const nextDocuments = await persistCustomerDocument(orgId, relatedToId, normalized);
      if (nextDocuments) normalized.documents = nextDocuments;
    }

    return res.status(201).json({ success: true, data: normalized });
  } catch (err) {
    next(err);
  }
};

export const uploadDocumentBinary: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const body = Buffer.isBuffer(req.body)
      ? req.body
      : req.body instanceof Uint8Array
        ? Buffer.from(req.body)
        : Buffer.alloc(0);

    if (!body.length) {
      return res.status(400).json({ success: false, message: "Attachment content is required", data: null });
    }

    const name = String(req.query.name || "attachment").trim() || "attachment";
    const relatedToType = String(req.query.relatedToType || "").trim().toLowerCase();
    const relatedToId = String(req.query.relatedToId || "").trim();
    const module = String(req.query.module || "").trim();
    const type = String(req.query.type || "").trim();
    const size = Number(req.query.size || body.length || 0);
    const mimeType = String(req.headers["content-type"] || "application/octet-stream").trim() || "application/octet-stream";

    if (relatedToType === "customer" && relatedToId) {
      const customerRecord = await Customer.findOne({ _id: relatedToId, organizationId: orgId })
        .select({ _id: 1 })
        .lean();
      if (!customerRecord) {
        return res.status(404).json({ success: false, message: "Customer not found", data: null });
      }
    }

    const created = await StoredDocument.create({
      organizationId: orgId,
      relatedToType,
      relatedToId,
      module,
      type,
      name,
      size: Number.isFinite(size) && size > 0 ? size : body.length,
      mimeType,
      contentBase64: body.toString("base64"),
      uploadedAt: new Date().toISOString(),
    });

    const normalized = normalizeDocument(created.toObject()) as any;
    if (relatedToType === "customer" && relatedToId) {
      const nextDocuments = await persistCustomerDocument(orgId, relatedToId, normalized);
      if (nextDocuments) normalized.documents = nextDocuments;
    }

    return res.status(201).json({ success: true, data: normalized });
  } catch (err) {
    next(err);
  }
};

export const deleteDocument: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const targetId = String(req.params.id || "").trim();
    const customerId = String(req.query.customerId || "").trim();
    const documentName = String(req.query.name || "").trim();
    const documentUploadedAt = String(req.query.uploadedAt || "").trim();
    const documentUrl = String(req.query.url || "").trim();
    const documentSize = normalizeComparableNumber(req.query.size);
    let matchedCustomerDocuments = false;
    const doc = await StoredDocument.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!doc) {
      const legacyFilter: Record<string, unknown> = {
        organizationId: orgId as unknown as string,
        documents: { $exists: true, $ne: [] },
      };
      if (customerId && mongoose.isValidObjectId(customerId)) {
        legacyFilter._id = customerId;
      }

      const legacyCustomers = await Customer.find(legacyFilter).lean();
      let matchedLegacy = false;
      for (const customer of legacyCustomers as any[]) {
        const current = Array.isArray(customer.documents) ? customer.documents : [];
        const filtered = current.filter((item: any) => {
          return !documentMatchesCandidate(item, {
            targetId,
            name: documentName,
            size: documentSize,
            uploadedAt: documentUploadedAt,
            url: documentUrl,
          });
        });
        if (filtered.length !== current.length) {
          matchedLegacy = true;
          matchedCustomerDocuments = true;
          await Customer.updateOne({ _id: customer._id, organizationId: orgId }, { $set: { documents: filtered } });
        }
      }
      if (matchedLegacy) {
        return res.json({ success: true, data: { id: String(req.params.id), documents: null } });
      }
      return res.status(404).json({ success: false, message: "Document not found", data: null });
    }

    await StoredDocument.deleteOne({ _id: req.params.id, organizationId: orgId });

    let documents: unknown[] | null = null;
    if (String(doc.relatedToType || "").toLowerCase() === "customer" && String(doc.relatedToId || "").trim()) {
      const customer = await findCustomerByAnyId(orgId, String(doc.relatedToId));
      if (customer) {
        const persistedCustomerId = String(customer._id || (customer as any)?.id || doc.relatedToId).trim();
        const current = Array.isArray((customer as any).documents) ? (customer as any).documents : [];
        const filtered = current.filter((item: any) => {
          const storedDocumentUrls = buildDocumentUrls(targetId);
          return !documentMatchesCandidate(item, {
            targetId,
            name: String(doc.name || documentName || "").trim(),
            size: normalizeComparableNumber(doc.size) ?? documentSize,
            uploadedAt: String(doc.uploadedAt || documentUploadedAt || "").trim(),
            url: String(documentUrl || storedDocumentUrls.downloadUrl || storedDocumentUrls.viewUrl || "").trim(),
          });
        });
        await Customer.updateOne(
          { _id: persistedCustomerId, organizationId: orgId },
          { $set: { documents: filtered } }
        );
        documents = filtered;
        matchedCustomerDocuments = true;
      } else {
        documents = [];
      }
    }

    if (!matchedCustomerDocuments) {
      await Customer.updateMany(
        { organizationId: orgId, documents: { $exists: true, $ne: [] } },
        [
          {
            $set: {
              documents: {
                $filter: {
                  input: "$documents",
                  as: "doc",
                  cond: {
                    $ne: [
                      {
                        $trim: {
                          input: {
                            $ifNull: [
                              "$$doc.documentId",
                              { $ifNull: ["$$doc.id", { $ifNull: ["$$doc._id", ""] }] }
                            ]
                          }
                        }
                      },
                      targetId
                    ]
                  }
                }
              }
            }
          }
        ]
      ).catch(() => null);
    }

    return res.json({ success: true, data: { id: String(doc._id), documents } });
  } catch (err) {
    next(err);
  }
};
