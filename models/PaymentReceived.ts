import mongoose from "mongoose";

const PaymentReceivedSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    paymentNumber: { type: String, required: true, index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    invoiceId: { type: String, default: "", index: true },
    invoiceNumber: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "" },
    depositTo: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    status: { type: String, default: "received", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

PaymentReceivedSchema.index({ organizationId: 1, paymentNumber: 1 }, { unique: true });
PaymentReceivedSchema.index({ organizationId: 1, updatedAt: -1 });

export const PaymentReceived = mongoose.model("PaymentReceived", PaymentReceivedSchema);
