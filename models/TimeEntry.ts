import mongoose from "mongoose";

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
  },
  { timestamps: true, strict: false, minimize: false }
);

export const TimeEntry = mongoose.model("TimeEntry", TimeEntrySchema);
