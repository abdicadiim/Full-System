import mongoose from "mongoose";

const RecurringInvoiceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    profileName: { type: String, required: true, index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    status: { type: String, default: "active", index: true },
    repeatEvery: { type: String, default: "month" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    lastGenerated: { type: Date, default: null },
    nextGeneration: { type: Date, default: null },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    items: { type: Array, default: [] },
  },
  { timestamps: true, strict: false, minimize: false }
);

export const RecurringInvoice = mongoose.model("RecurringInvoice", RecurringInvoiceSchema);
