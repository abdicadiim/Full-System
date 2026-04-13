import mongoose from "mongoose";

const AddonSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    product: { type: String, required: true, index: true }, // product name
    addonName: { type: String, required: true, index: true },
    addonCode: { type: String, required: true, index: true },

    description: { type: String, default: "" },
    status: { type: String, default: "Active", index: true },

    addonType: { type: String, default: "Recurring" }, // Recurring | One-time
    pricingModel: { type: String, default: "Per Unit" }, // Per Unit | Volume | Tier | Package | Flat

    unit: { type: String, default: "" },
    billingFrequency: { type: String, default: "" },
    startingQuantity: { type: Number, default: 0 },
    endingQuantity: { type: Number, default: 0 },

    price: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },

    account: { type: String, default: "Sales" },
    taxName: { type: String, default: "" }, // UI label e.g. "VAT [5%]"

    associatedPlans: { type: String, default: "All Plans" },
    selectedPlans: { type: [String], default: [] },
    selectedPlanIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Plan", default: [] },
    includeInWidget: { type: Boolean, default: false },
    showInPortal: { type: Boolean, default: false },

    volumeBrackets: { type: mongoose.Schema.Types.Mixed, default: [] },
    pricingBrackets: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

AddonSchema.index({ organizationId: 1, addonCode: 1 }, { unique: true });
AddonSchema.index({ organizationId: 1, updatedAt: -1 });

export const Addon = mongoose.model("Addon", AddonSchema);
