import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    isSystem: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

RoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model("Role", RoleSchema);

