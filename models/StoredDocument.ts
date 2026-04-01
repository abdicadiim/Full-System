import mongoose from "mongoose";

const StoredDocumentSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    relatedToType: { type: String, default: "", index: true },
    relatedToId: { type: String, default: "", index: true },
    module: { type: String, default: "" },
    type: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/octet-stream" },
    contentBase64: { type: String, default: "" },
    uploadedAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

StoredDocumentSchema.index({ organizationId: 1, relatedToType: 1, relatedToId: 1 });

export const StoredDocument = mongoose.model("StoredDocument", StoredDocumentSchema);
