import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import { createTax, deleteTax, getTaxById, listTaxes, updateTax } from "../controllers/taxesController.js";

export const taxesRoutes = Router();

taxesRoutes.get("/", requireAuth, listTaxes);
taxesRoutes.get("/:id", requireAuth, getTaxById);
taxesRoutes.post("/", requireAuth, requireOrgAdmin, createTax);
taxesRoutes.put("/:id", requireAuth, requireOrgAdmin, updateTax);
taxesRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteTax);

