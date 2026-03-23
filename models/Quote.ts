import mongoose from "mongoose";

const QuoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    quoteNumber: { type: String, required: true, index: true },
    referenceNumber: { type: String, default: "" },
    quoteDate: { type: Date, required: true, index: true },
    expiryDate: { type: Date, index: true },

    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true, index: true },
    
    salespersonId: { type: String, default: "" },
    salespersonName: { type: String, default: "" },
    
    projectId: { type: String, default: "" },
    projectName: { type: String, default: "" },

    subject: { type: String, default: "" },
    status: { type: String, default: "Draft", index: true },
    currency: { type: String, required: true },
    
    priceListId: { type: String, default: "" },
    priceListName: { type: String, default: "" },
    
    location: { type: String, default: "Head Office" },
    taxPreference: { type: String, enum: ["Tax Exclusive", "Tax Inclusive"], default: "Tax Exclusive" },

    items: [{
      itemId: { type: String, default: "" },
      itemType: { type: String, default: "item" },
      name: { type: String, required: true },
      description: { type: String, default: "" },
      quantity: { type: Number, default: 1 },
      rate: { type: Number, default: 0 },
      taxId: { type: String, default: "" },
      taxName: { type: String, default: "" },
      taxRate: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      discountType: { type: String, default: "percent" },
      amount: { type: Number, default: 0 },
      reportingTags: [{
        tagId: { type: String },
        tagName: { type: String },
        value: { type: String }
      }]
    }],

    subTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    
    discount: { type: Number, default: 0 },
    discountType: { type: String, default: "percent" },
    discountAmount: { type: Number, default: 0 },
    discountAccount: { type: String, default: "" },
    
    shippingCharges: { type: Number, default: 0 },
    shippingChargeTax: { type: String, default: "" },
    shippingTaxAmount: { type: Number, default: 0 },
    
    adjustment: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    
    customerNotes: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
    attachedFiles: { type: Array, default: [] },
    customerEmail: { type: String, default: "" },

    // Tracking for Billing vs Invoice system if needed
    source: { type: String, default: "Billing", index: true }
  },
  { timestamps: true }
);

QuoteSchema.index({ organizationId: 1, quoteNumber: 1 }, { unique: true });

export const Quote = mongoose.model("Quote", QuoteSchema);
