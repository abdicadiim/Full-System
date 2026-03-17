import mongoose from "mongoose";

const CustomersVendorsSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },

    allowDuplicates: { type: Boolean, default: true },

    enableCustomerNumbers: { type: Boolean, default: false },
    customerNumberPrefix: { type: String, default: "CUS-" },
    customerNumberStart: { type: String, default: "0001" },

    enableVendorNumbers: { type: Boolean, default: false },
    vendorNumberPrefix: { type: String, default: "VEN-" },
    vendorNumberStart: { type: String, default: "0001" },

    defaultCustomerType: { type: String, enum: ["business", "individual"], default: "business" },

    enableCreditLimit: { type: Boolean, default: false },
    creditLimitAction: { type: String, enum: ["restrict", "warn"], default: "warn" },
    includeSalesOrders: { type: Boolean, default: false },

    billingAddressFormat: {
      type: String,
      default:
        "${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}",
    },
    shippingAddressFormat: {
      type: String,
      default:
        "${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}",
    },

    customFields: { type: Array, default: [] },
    customButtons: { type: Array, default: [] },
    relatedLists: { type: Array, default: [] },
  },
  { timestamps: true }
);

export const CustomersVendorsSettings = mongoose.model("CustomersVendorsSettings", CustomersVendorsSettingsSchema);

