import mongoose from "mongoose";

const SalesReceiptSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    receiptNumber: { type: String, required: true, index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    status: { type: String, default: "paid", index: true },
    total: { type: Number, default: 0 },
    depositTo: { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    currency: { type: String, default: "USD" },
    items: { type: Array, default: [] },
  },
  { timestamps: true, strict: false, minimize: false }
);

SalesReceiptSchema.index({ organizationId: 1, receiptNumber: 1 }, { unique: true });

export const SalesReceipt = mongoose.model("SalesReceipt", SalesReceiptSchema);
