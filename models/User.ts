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
    inviteRejectedAt: { type: Date, default: null, index: true },
    inviteTokenHash: { type: String, default: "", index: true },
    inviteTokenExpiresAt: { type: Date, default: null, index: true },
    inviteTokenSentAt: { type: Date, default: null, index: true },

    emailVerified: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date, default: null, index: true },
    emailVerificationHash: { type: String, default: "" },
    emailVerificationExpiresAt: { type: Date, default: null, index: true },
    emailVerificationSentAt: { type: Date, default: null, index: true },

    // Temporary auth codes for email OTP sign-in and password resets.
    loginOtpHash: { type: String, default: "" },
    loginOtpExpiresAt: { type: Date, default: null, index: true },
    loginOtpSentAt: { type: Date, default: null, index: true },
    passwordResetHash: { type: String, default: "" },
    passwordResetExpiresAt: { type: Date, default: null, index: true },
    passwordResetSentAt: { type: Date, default: null, index: true },
    sessionVersion: { type: Number, default: 0, index: true },

    // Optional avatar (can be a URL or a data: URI)
    photoUrl: { type: String, default: "" },

    // Store active timer state to sync across applications
    activeTimer: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
