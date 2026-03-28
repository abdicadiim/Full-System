import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import { createUser, deleteUser, getUserActivities, getUserById, listUsers, sendUserInvitation, updateUser } from "../controllers/usersController.js";

export const usersRoutes = Router();

usersRoutes.get("/", requireAuth, requireOrgAdmin, listUsers);
usersRoutes.get("/:id/activities", requireAuth, requireOrgAdmin, getUserActivities);
usersRoutes.get("/:id", requireAuth, requireOrgAdmin, getUserById);
usersRoutes.post("/", requireAuth, requireOrgAdmin, createUser);
usersRoutes.put("/:id", requireAuth, requireOrgAdmin, updateUser);
usersRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteUser);
usersRoutes.post("/:id/send-invitation", requireAuth, requireOrgAdmin, sendUserInvitation);
