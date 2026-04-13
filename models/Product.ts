import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    status: { type: String, default: "Active", index: true },

    emailRecipients: { type: String, default: "" },
    redirectionUrl: { type: String, default: "" },

    autoGenerateSubscriptionNumbers: { type: Boolean, default: false },
    prefix: { type: String, default: "" },
    nextNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

ProductSchema.index({ organizationId: 1, name: 1 }, { unique: true });
ProductSchema.index({ organizationId: 1, updatedAt: -1 });

export const Product = mongoose.model("Product", ProductSchema);

