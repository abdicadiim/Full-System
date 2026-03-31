import mongoose from "mongoose";

const RefundSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    refundNumber: { type: String, required: true, index: true },
    paymentId: { type: String, default: "", index: true },
    creditNoteId: { type: String, default: "", index: true },
    invoiceId: { type: String, default: "", index: true },
    invoiceNumber: { type: String, default: "" },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    refundDate: { type: Date, default: Date.now, index: true },
    paymentMethod: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    fromAccount: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, default: "processed", index: true },
    currency: { type: String, default: "USD" },
  },
  { timestamps: true, strict: false, minimize: false }
);

RefundSchema.index({ organizationId: 1, refundNumber: 1 }, { unique: true });

export const Refund = mongoose.model("Refund", RefundSchema);
