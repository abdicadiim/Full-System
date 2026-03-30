import mongoose from "mongoose";

const QuoteSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },

    allowEditingAcceptedQuotes: { type: Boolean, default: false },
    allowCustomerAcceptDecline: { type: Boolean, default: false },
    automationOption: { type: String, default: "dont-convert" },
    allowProgressInvoice: { type: Boolean, default: false },
    hideZeroValueItems: { type: Boolean, default: false },
    retainFields: {
      customerNotes: { type: Boolean, default: false },
      termsConditions: { type: Boolean, default: false },
      address: { type: Boolean, default: false },
    },
    termsConditions: { type: String, default: "" },
    customerNotes: { type: String, default: "Looking forward for your business." },

    approvalType: { type: String, default: "no-approval" },
    notificationPreference: { type: String, default: "all-submitters" },
    notificationEmail: { type: String, default: "" },
    sendNotifications: { type: Boolean, default: true },
    notifySubmitter: { type: Boolean, default: true },
    approvalLevels: { type: Array, default: [] },

    customFields: {
      type: Array,
      default: [
        { name: "Sales person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
        { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
      ],
    },
    customButtons: { type: Array, default: [] },
    relatedLists: { type: Array, default: [] },
  },
  { timestamps: true }
);

export const QuoteSettings = mongoose.model("QuoteSettings", QuoteSettingsSchema);
