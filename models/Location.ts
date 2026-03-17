import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    attention: { type: String, default: "" },
    street1: { type: String, default: "" },
    street2: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
  },
  { _id: false }
);

const ContactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const LocationAccessSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    role: { type: String, default: "" },
  },
  { _id: false }
);

const LocationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `loc-${new mongoose.Types.ObjectId().toHexString()}` },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    name: { type: String, required: true, index: true },
    type: { type: String, default: "Business" }, // Business | Warehouse

    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },

    parentLocation: { type: String, default: "" },

    address: { type: AddressSchema, default: () => ({}) },
    website: { type: String, default: "" },
    primaryContact: { type: String, default: "" },
    contactPerson: { type: ContactPersonSchema, default: () => ({}) },

    transactionNumberSeriesId: { type: String, default: "" },
    defaultTransactionNumberSeriesId: { type: String, default: "" },
    defaultTransactionSeries: { type: String, default: "" },

    locationAccess: { type: [LocationAccessSchema], default: [] },

    notes: { type: String, default: "" },
    logo: { type: String, default: "" },
    status: { type: String, default: "Active", index: true },
  },
  { timestamps: true }
);

LocationSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Location = mongoose.model("Location", LocationSchema);

