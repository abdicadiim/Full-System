import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import { createRole, deleteRole, getRole, listRoles, updateRole } from "../controllers/rolesController.js";

export const rolesRoutes = Router();

rolesRoutes.get("/", requireAuth, requireOrgAdmin, listRoles);
rolesRoutes.get("/:id", requireAuth, requireOrgAdmin, getRole);
rolesRoutes.post("/", requireAuth, requireOrgAdmin, createRole);
rolesRoutes.put("/:id", requireAuth, requireOrgAdmin, updateRole);
rolesRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteRole);

