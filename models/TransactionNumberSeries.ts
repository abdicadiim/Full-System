import mongoose from "mongoose";

const TransactionNumberSeriesSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `txs-${new mongoose.Types.ObjectId().toHexString()}` },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    seriesName: { type: String, required: true, index: true },

    // Human label like "Invoice", "Sales Receipt"
    module: { type: String, required: true, index: true },
    // Extra compatibility fields expected by some UI code
    name: { type: String, default: "" },
    moduleKey: { type: String, default: "", index: true },

    prefix: { type: String, default: "" },
    startingNumber: { type: String, default: "1" },
    nextNumber: { type: Number, default: 1 },

    restartNumbering: { type: String, default: "none" },
    isDefault: { type: Boolean, default: false },

    locationIds: { type: [String], default: [] },
    status: { type: String, default: "Active", index: true },
  },
  { timestamps: true }
);

TransactionNumberSeriesSchema.index({ organizationId: 1, seriesName: 1, module: 1 }, { unique: true });

export const TransactionNumberSeries = mongoose.model("TransactionNumberSeries", TransactionNumberSeriesSchema);

