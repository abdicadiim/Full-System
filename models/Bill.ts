import mongoose from "mongoose";

const BillSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    billNumber: { type: String, required: true, index: true },
    vendorId: { type: String, default: "", index: true },
    vendorName: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, default: null },
    status: { type: String, default: "open", index: true },
    total: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
  },
  { timestamps: true, strict: false, minimize: false }
);

BillSchema.index({ organizationId: 1, billNumber: 1 }, { unique: true });

export const Bill = mongoose.model("Bill", BillSchema);
