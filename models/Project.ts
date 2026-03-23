import mongoose from "mongoose";

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
  },
  { timestamps: true, strict: false, minimize: false }
);

export const Project = mongoose.model("Project", ProjectSchema);
