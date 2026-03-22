import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    product: { type: String, required: true, index: true }, // product name
    couponName: { type: String, required: true, index: true },
    couponCode: { type: String, required: true, index: true },

    discountType: { type: String, default: "Flat" }, // Percentage | Flat
    discountValue: { type: Number, default: 0 },

    redemptionType: { type: String, default: "One Time" }, // One Time | Unlimited | Limited Cycles
    limitedCycles: { type: Number, default: 0 },
    maxRedemption: { type: Number, default: 0 },

    associatedPlans: { type: String, default: "All Plans" },
    associatedAddons: { type: String, default: "All Addons" },
    selectedPlanIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Plan", default: [] },
    selectedAddonIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Addon", default: [] },

    expirationDate: { type: String, default: "" },
    status: { type: String, default: "Active", index: true }, // Active | Inactive | Expired
  },
  { timestamps: true }
);

CouponSchema.index({ organizationId: 1, couponCode: 1 }, { unique: true });

export const Coupon = mongoose.model("Coupon", CouponSchema);
