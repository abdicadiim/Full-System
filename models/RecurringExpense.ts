import mongoose from "mongoose";

const RecurringExpenseSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    profileName: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
    vendorId: { type: String, default: "", index: true },
    vendorName: { type: String, default: "" },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    status: { type: String, default: "active", index: true },
    repeatEvery: { type: String, default: "month" },
    startDate: { type: Date, default: Date.now },
    nextGeneration: { type: Date, default: null },
    lastGenerated: { type: Date, default: null },
  },
  { timestamps: true, strict: false, minimize: false }
);

export const RecurringExpense = mongoose.model("RecurringExpense", RecurringExpenseSchema);
