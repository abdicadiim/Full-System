import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    invoiceNumber: { type: String, required: true, index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },

    priceListId: { type: String, default: "" },
    priceListName: { type: String, default: "" },

    date: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, default: null },
    status: { type: String, default: "draft", index: true },

    items: { type: Array, default: [] },
    subTotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
  },
  { timestamps: true, strict: false, minimize: false }
);

InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice = mongoose.model("Invoice", InvoiceSchema);

