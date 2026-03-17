import mongoose from "mongoose";

const TransactionNumberSeriesSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    preventDuplicates: { type: String, default: "all_fiscal_years" },
  },
  { timestamps: true }
);

export const TransactionNumberSeriesSettings = mongoose.model(
  "TransactionNumberSeriesSettings",
  TransactionNumberSeriesSettingsSchema
);

