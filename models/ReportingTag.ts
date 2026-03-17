import mongoose from "mongoose";

const ReportingTagSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    appliesTo: { type: [String], default: [] },
    moduleLevel: { type: mongoose.Schema.Types.Mixed, default: {} },
    isMandatory: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ReportingTagSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const ReportingTag = mongoose.model("ReportingTag", ReportingTagSchema);

