import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    attention: { type: String, default: "" },
    country: { type: String, default: "" },
    street1: { type: String, default: "" },
    street2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
  },
  { _id: false }
);

const AdditionalAddressSchema = new mongoose.Schema(
  {
    addressId: { type: String, default: "" },
    attention: { type: String, default: "" },
    country: { type: String, default: "" },
    street1: { type: String, default: "" },
    street2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const CustomerCommentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: "" },
    content: { type: String, default: "" },
    authorName: { type: String, default: "You" },
    authorInitial: { type: String, default: "Y" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    author: { type: String, default: "You" },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false, strict: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    name: { type: String, default: "" },
    displayName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    email: { type: String, default: "" },

    customerNumber: { type: String, default: "", index: true },
    status: { type: String, default: "active", index: true },
    type: { type: String, default: "business" },

    billingAddress: { type: AddressSchema, default: () => ({}) },
    shippingAddress: { type: AddressSchema, default: () => ({}) },
    additionalAddresses: { type: [AdditionalAddressSchema], default: [] },
    enablePortal: { type: Boolean, default: false },
    paymentReminderEnabled: { type: Boolean, default: false },

    comments: { type: [CustomerCommentSchema], default: [] },
    contactPersons: { type: Array, default: [] },
    documents: { type: Array, default: [] },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    reportingTags: { type: Array, default: [] },
    mergedInto: { type: String, default: "" },
  },
  { timestamps: true, strict: false, minimize: false }
);

CustomerSchema.index({ organizationId: 1, customerNumber: 1 }, { unique: false });
CustomerSchema.index({ organizationId: 1, email: 1 });

export const Customer = mongoose.model("Customer", CustomerSchema);

