import mongoose from "mongoose";

const EmailRelayServerSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    serverName: { type: String, default: "" },
    port: { type: Number, default: 587 },
    dailyMailLimit: { type: Number, default: 300 },
    useSecureConnection: { type: String, default: "TLS" }, // "SSL" | "TLS" | "Never"
    mailDeliveryPreference: { type: String, default: "domain" }, // "domain" | "email"
    domainInServer: { type: String, default: "" },
    authenticationRequired: { type: Boolean, default: false },
    username: { type: String, default: "" },
    password: { type: String, default: "" },
    isEnabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const EmailRelayServer = mongoose.model("EmailRelayServer", EmailRelayServerSchema);

