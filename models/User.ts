import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    role: { type: String, default: "member", index: true },
    status: { type: String, enum: ["Active", "Inactive", "Invited"], default: "Active", index: true },

    // Optional user-specific access settings used by Billing/Invoice UIs
    accessibleLocations: { type: [String], default: [] },
    defaultBusinessLocation: { type: String, default: "" },
    defaultWarehouseLocation: { type: String, default: "" },

    inviteSentAt: { type: Date, default: null, index: true },
    inviteAcceptedAt: { type: Date, default: null, index: true },

    // Optional avatar (can be a URL or a data: URI)
    photoUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
