import mongoose from "mongoose";

const SenderEmailSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    isPrimary: { type: Boolean, default: false, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verificationToken: { type: String, default: "", index: true },
    verificationTokenExpiresAt: { type: Date, default: null },
    verificationSentAt: { type: Date, default: null },

    // Optional per-sender SMTP configuration
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 0 },
    smtpUser: { type: String, default: "" },
    // Write-only: never return to clients
    smtpPassword: { type: String, default: "" },
    smtpSecure: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SenderEmailSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const SenderEmail = mongoose.model("SenderEmail", SenderEmailSchema);
