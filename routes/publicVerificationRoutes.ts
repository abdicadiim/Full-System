import { Router } from "express";
import {
  acceptSenderInvitationPublic,
  getSenderInvitationPublic,
  rejectSenderInvitationPublic,
  resendSenderOtpPublic,
  verifySenderOtpPublic,
} from "../controllers/emailSettingsController.js";

export const publicVerificationRoutes = Router();

publicVerificationRoutes.get("/sender-emails/invitations/:id", getSenderInvitationPublic);
publicVerificationRoutes.post("/sender-emails/invitations/:id/accept", acceptSenderInvitationPublic);
publicVerificationRoutes.post("/sender-emails/invitations/:id/reject", rejectSenderInvitationPublic);
publicVerificationRoutes.post("/sender-emails/invitations/:id/resend-otp", resendSenderOtpPublic);
publicVerificationRoutes.post("/sender-emails/invitations/:id/verify-otp", verifySenderOtpPublic);
