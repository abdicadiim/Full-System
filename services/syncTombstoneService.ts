import { SyncTombstone } from "../models/SyncTombstone.js";

export const recordDeletion = async (params: {
  organizationId: string;
  resourceId: string;
  documentId: string;
}) => {
  const { organizationId, resourceId, documentId } = params;
  if (!organizationId || !resourceId || !documentId) return;

  await SyncTombstone.updateOne(
    { organizationId, resourceId, documentId },
    { $set: { deletedAt: new Date() } },
    { upsert: true }
  ).catch(() => null);
};

export const recordDeletions = async (params: {
  organizationId: string;
  resourceId: string;
  documentIds: string[];
}) => {
  const { organizationId, resourceId, documentIds } = params;
  if (!organizationId || !resourceId) return;
  const ids = (Array.isArray(documentIds) ? documentIds : []).map((id) => String(id || "").trim()).filter(Boolean);
  if (ids.length === 0) return;

  const ops = ids.map((documentId) => ({
    updateOne: {
      filter: { organizationId, resourceId, documentId },
      update: { $set: { deletedAt: new Date() } },
      upsert: true,
    },
  }));

  await SyncTombstone.bulkWrite(ops, { ordered: false }).catch(() => null);
};
