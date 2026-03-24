import mongoose from "mongoose";

const PaymentMadeSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    paymentNumber: { type: String, required: true, index: true },
    vendorId: { type: String, default: "", index: true },
    vendorName: { type: String, default: "" },
    billId: { type: String, default: "", index: true },
    billNumber: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "" },
    paidThrough: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    status: { type: String, default: "paid", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

PaymentMadeSchema.index({ organizationId: 1, paymentNumber: 1 }, { unique: true });

export const PaymentMade = mongoose.model("PaymentMade", PaymentMadeSchema);
