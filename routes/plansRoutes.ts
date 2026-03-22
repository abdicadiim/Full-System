import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { bulkCreatePlans, createPlan, deletePlan, getPlanById, listPlans, updatePlan } from "../controllers/plansController.js";

export const plansRoutes = Router();

plansRoutes.get("/", requireAuth, listPlans);
plansRoutes.post("/", requireAuth, createPlan);
plansRoutes.post("/bulk", requireAuth, bulkCreatePlans);
plansRoutes.get("/:id", requireAuth, getPlanById);
plansRoutes.put("/:id", requireAuth, updatePlan);
plansRoutes.delete("/:id", requireAuth, deletePlan);
