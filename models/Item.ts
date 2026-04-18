import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    name: { type: String, default: "" },
    nameKey: { type: String, default: "", index: true },
    sku: { type: String, default: "" },
    skuKey: { type: String, default: "", index: true },
    description: { type: String, default: "" },
    unit: { type: String, default: "" },
    rate: { type: Number, default: 0 },

    status: { type: String, default: "Active", index: true },
    isActive: { type: Boolean, default: true, index: true },
    type: { type: String, default: "goods", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

ItemSchema.index({ organizationId: 1, name: 1 });
ItemSchema.index({ organizationId: 1, sku: 1 });
ItemSchema.index({ organizationId: 1, nameKey: 1 });
ItemSchema.index({ organizationId: 1, skuKey: 1 });
ItemSchema.index({ organizationId: 1, updatedAt: -1 });

export const Item = mongoose.model("Item", ItemSchema);

