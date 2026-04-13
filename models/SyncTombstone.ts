import mongoose from "mongoose";

const SyncTombstoneSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    resourceId: { type: String, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    deletedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false }
);

SyncTombstoneSchema.index({ organizationId: 1, resourceId: 1, deletedAt: -1 });
SyncTombstoneSchema.index({ organizationId: 1, resourceId: 1, documentId: 1 }, { unique: true });

export const SyncTombstone = mongoose.model("SyncTombstone", SyncTombstoneSchema);
