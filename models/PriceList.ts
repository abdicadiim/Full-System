import mongoose from "mongoose";

const PriceListSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    status: { type: String, default: "Active", index: true },
    currency: { type: String, required: true },
    priceListType: { type: String, enum: ["Sales", "Individual"], default: "Sales", index: true },
    pricingScheme: { type: String, enum: ["Unit", "Volume"], default: "Unit" },
    discountEnabled: { type: Boolean, default: false },
    roundOffTo: { type: String, default: "Never mind" },
    markup: { type: String, default: "1%" },
    markupType: { type: String, enum: ["Markup", "Markdown"], default: "Markup" },

    itemRates: [{
      itemId: { type: String, required: true },
      itemName: { type: String, required: true },
      sku: { type: String, default: "" },
      rate: { type: Number, default: null },
      discount: { type: Number, default: null }
    }],

    productRates: [{
      productId: { type: String, required: true },
      productName: { type: String, required: true },
      plans: [{
        planId: { type: String, required: true },
        name: { type: String, required: true },
        rate: { type: Number, default: null }
      }],
      addons: [{
        addonId: { type: String, required: true },
        name: { type: String, required: true },
        rate: { type: Number, default: null }
      }]
    }]
  },
  { timestamps: true }
);

PriceListSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const PriceList = mongoose.model("PriceList", PriceListSchema);
