import mongoose from "mongoose";

const EmailNotificationPreferencesSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    emailInsightsEnabled: { type: Boolean, default: false },
    signature: { type: String, default: "" },
  },
  { timestamps: true }
);

export const EmailNotificationPreferences = mongoose.model(
  "EmailNotificationPreferences",
  EmailNotificationPreferencesSchema
);

