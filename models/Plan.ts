import mongoose from "mongoose";

const PlanFeatureSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    tooltip: { type: String, default: "" },
    addNewTag: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlanCommentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    content: { type: String, default: "" },
    text: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    authorName: { type: String, default: "" },
    authorInitial: { type: String, default: "" },
  },
  { _id: false }
);

const PlanSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    product: { type: String, required: true, index: true }, // product name (Zoho-like)
    planName: { type: String, required: true, index: true },
    planCode: { type: String, required: true, index: true },

    status: { type: String, default: "Active", index: true },

    billingFrequencyValue: { type: String, default: "1" },
    billingFrequencyPeriod: { type: String, default: "Month(s)" },
    billingCyclesType: { type: String, default: "Auto-renews until canceled" },
    billingCyclesCount: { type: String, default: "" },

    planDescription: { type: String, default: "" },
    pricingModel: { type: String, default: "Per Unit" },
    unitName: { type: String, default: "" },

    price: { type: Number, required: true, default: 0 },
    freeTrialDays: { type: Number, default: 0 },
    setupFee: { type: Number, default: 0 },
    type: { type: String, default: "Service" },

    salesTax: { type: String, default: "" }, // UI label, e.g. "VAT [5%]"
    widgetsPreference: { type: Boolean, default: false },
    showInPortal: { type: Boolean, default: false },

    planFeatures: { type: [PlanFeatureSchema], default: [] },
    planChange: { type: Boolean, default: false },
    planAccount: { type: String, default: "Sales" },
    setupFeeAccount: { type: String, default: "Sales" },

    image: { type: String, default: "" },

    comments: { type: [PlanCommentSchema], default: [] },
    reportingTagValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PlanSchema.index({ organizationId: 1, planCode: 1 }, { unique: true });
PlanSchema.index({ organizationId: 1, updatedAt: -1 });

export const Plan = mongoose.model("Plan", PlanSchema);
