import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, default: "", index: true },
    resource: { type: String, default: "", index: true },
    entityType: { type: String, default: "", index: true },
    entityId: { type: String, default: "" },
    entityName: { type: String, default: "" },
    method: { type: String, default: "" },
    path: { type: String, default: "" },
    summary: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    statusCode: { type: Number, default: 0 },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ organizationId: 1, actorId: 1, occurredAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
