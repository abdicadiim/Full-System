import mongoose from "mongoose";

const TimeEntryCommentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: "" },
    content: { type: String, default: "" },
    authorName: { type: String, default: "" },
    authorInitial: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
  },
  { _id: false }
);

const TimeEntrySchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    projectId: { type: String, required: true, index: true },
    projectName: { type: String, default: "" },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    duration: { type: Number, default: 0 },
    billingStatus: { type: String, default: "unbilled", index: true },
    userName: { type: String, default: "" },
    taskName: { type: String, default: "" },
    comments: { type: [TimeEntryCommentSchema], default: [] },
  },
  { timestamps: true, strict: false, minimize: false }
);

export const TimeEntry = mongoose.model("TimeEntry", TimeEntrySchema);
