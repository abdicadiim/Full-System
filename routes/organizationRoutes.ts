import { Router } from "express";
import { getMyOrganization, updateMyOrganization } from "../controllers/organizationController.js";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";

export const organizationRoutes = Router();

organizationRoutes.get("/me", requireAuth, getMyOrganization);
organizationRoutes.patch("/me", requireAuth, requireOrgAdmin, updateMyOrganization);

