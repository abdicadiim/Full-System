import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { getSalesByCustomerReport } from "../controllers/reportsController.js";

export const reportsRoutes = Router();

reportsRoutes.use(requireAuth);
reportsRoutes.get("/sales-by-customer", getSalesByCustomerReport);
