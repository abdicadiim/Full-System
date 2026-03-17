import mongoose from "mongoose";

const EmailTemplateSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    key: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EmailTemplateSchema.index({ organizationId: 1, key: 1 }, { unique: true });

export const EmailTemplate = mongoose.model("EmailTemplate", EmailTemplateSchema);

