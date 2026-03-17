import mongoose from "mongoose";

export type TaxKind = "tax" | "group";

const TaxSchema = new mongoose.Schema(
  {
    // Use string ids so existing frontend local ids can be persisted as-is.
    // This avoids needing a migration/mapping layer between LocalStorage ids and Mongo ObjectIds.
    _id: { type: String, default: () => `tax-${new mongoose.Types.ObjectId().toHexString()}` },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    kind: { type: String, enum: ["tax", "group"], default: "tax", index: true },
    name: { type: String, required: true, index: true },
    rate: { type: Number, default: 0 },
    type: { type: String, default: "both" },
    description: { type: String, default: "" },

    groupTaxes: { type: [String], default: [] },

    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },

    isCompound: { type: Boolean, default: false },
    isDigitalServiceTax: { type: Boolean, default: false },
    digitalServiceCountry: { type: String, default: "" },
    trackTaxByCountryScheme: { type: Boolean, default: false },
    accountToTrackSales: { type: String, default: "" },
    accountToTrackPurchases: { type: String, default: "" },
    isValueAddedTax: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaxSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Tax = mongoose.model("Tax", TaxSchema);
