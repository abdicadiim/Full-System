import { Router } from "express";
import { verifySenderEmailPublic } from "../controllers/emailSettingsController.js";

export const publicVerificationRoutes = Router();

publicVerificationRoutes.get("/sender-emails/verify", verifySenderEmailPublic);
