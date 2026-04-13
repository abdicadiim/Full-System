import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, default: 0 },
    vendorId: { type: String, default: "", index: true },
    vendorName: { type: String, default: "" },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    accountId: { type: String, default: "" },
    accountName: { type: String, default: "" },
    status: { type: String, default: "unbilled", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

ExpenseSchema.index({ organizationId: 1, updatedAt: -1 });

export const Expense = mongoose.model("Expense", ExpenseSchema);
