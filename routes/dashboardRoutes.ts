import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { getDashboardSummary } from "../controllers/dashboardController.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/summary", requireAuth, getDashboardSummary);

