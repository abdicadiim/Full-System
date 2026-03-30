import mongoose from "mongoose";

const ItemSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },

    decimalPlaces: { type: String, default: "2" },
    allowDuplicateNames: { type: Boolean, default: true },
    enableEnhancedSearch: { type: Boolean, default: true },
    enablePriceLists: { type: Boolean, default: true },

    customFields: { type: Array, default: [] },
    customButtons: { type: Array, default: [] },
    relatedLists: { type: Array, default: [] },
  },
  { timestamps: true }
);

export const ItemSettings = mongoose.model("ItemSettings", ItemSettingsSchema);
