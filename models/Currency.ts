import mongoose from "mongoose";

const ExchangeRateSchema = new mongoose.Schema(
  {
    date: { type: String, default: "" },
    rate: { type: mongoose.Schema.Types.Mixed, default: "" },
  },
  { _id: false }
);

const CurrencySchema = new mongoose.Schema(
  {
    // Use string ids so existing frontend local ids can be persisted as-is.
    _id: { type: String, default: () => `cur-${new mongoose.Types.ObjectId().toHexString()}` },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    code: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    symbol: { type: String, default: "" },

    decimalPlaces: { type: String, default: "2" },
    format: { type: String, default: "1,234,567.89" },

    isBaseCurrency: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },

    exchangeRates: { type: [ExchangeRateSchema], default: [] },
  },
  { timestamps: true }
);

CurrencySchema.index({ organizationId: 1, code: 1 }, { unique: true });
CurrencySchema.index({ organizationId: 1, updatedAt: -1 });

export const Currency = mongoose.model("Currency", CurrencySchema);

