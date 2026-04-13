import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    subscriptionNumber: { type: String, default: "", index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    status: { type: String, default: "DRAFT", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

SubscriptionSchema.index({ organizationId: 1, customerId: 1, createdAt: -1 });
SubscriptionSchema.index({ organizationId: 1, updatedAt: -1 });

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
