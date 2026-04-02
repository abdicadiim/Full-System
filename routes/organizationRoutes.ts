import { Router } from "express";
import {
  getMyOrganization,
  getOrganizationById,
  listOrganizations,
  updateMyOrganization,
  updateOrganizationById,
} from "../controllers/organizationController.js";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";

export const organizationRoutes = Router();

organizationRoutes.get("/me", requireAuth, getMyOrganization);
organizationRoutes.patch("/me", requireAuth, requireOrgAdmin, updateMyOrganization);
organizationRoutes.get("/", requireAuth, listOrganizations);
organizationRoutes.get("/:organization_id", requireAuth, getOrganizationById);
organizationRoutes.put("/:organization_id", requireAuth, requireOrgAdmin, updateOrganizationById);
