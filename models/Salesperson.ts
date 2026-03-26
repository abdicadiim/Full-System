import mongoose from "mongoose";

const SalespersonSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    status: { type: String, default: "active", index: true },
  },
  { timestamps: true, strict: false, minimize: false }
);

export const Salesperson = mongoose.model("Salesperson", SalespersonSchema);
