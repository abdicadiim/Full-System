import mongoose from "mongoose";

const CreditNoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    creditNoteNumber: { type: String, required: true, index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    invoiceId: { type: String, default: "", index: true },
    invoiceNumber: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    status: { type: String, default: "open", index: true },
    total: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    items: { type: Array, default: [] },
  },
  { timestamps: true, strict: false, minimize: false }
);

CreditNoteSchema.index({ organizationId: 1, creditNoteNumber: 1 }, { unique: true });

export const CreditNote = mongoose.model("CreditNote", CreditNoteSchema);
