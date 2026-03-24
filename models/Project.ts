import mongoose from "mongoose";

const ProjectCommentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: "" },
    content: { type: String, default: "" },
    authorName: { type: String, default: "You" },
    authorInitial: { type: String, default: "Y" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProjectAttachmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    documentId: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    type: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    url: { type: String, default: "" },
    uploadedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    billingMethod: { type: String, default: "fixed", index: true },
    rate: { type: Number, default: 0 },
    status: { type: String, default: "active", index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    comments: { type: [ProjectCommentSchema], default: [] },
    attachments: { type: [ProjectAttachmentSchema], default: [] },
  },
  { timestamps: true, strict: false, minimize: false }
);

export const Project = mongoose.model("Project", ProjectSchema);
