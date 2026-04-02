import mongoose from "mongoose";

const GeneralSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const GeneralSettings = mongoose.model("GeneralSettings", GeneralSettingsSchema);
