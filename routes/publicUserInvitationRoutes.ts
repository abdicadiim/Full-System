import { Router } from "express";
import {
  acceptUserInvitationPublic,
  getUserInvitationPublic,
  rejectUserInvitationPublic,
} from "../controllers/usersController.js";

export const publicUserInvitationRoutes = Router();

publicUserInvitationRoutes.get("/users/invitations/:id", getUserInvitationPublic);
publicUserInvitationRoutes.post("/users/invitations/:id/accept", acceptUserInvitationPublic);
publicUserInvitationRoutes.post("/users/invitations/:id/reject", rejectUserInvitationPublic);
