import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { getSalesByCustomerReport, getSalesByItemReport } from "../controllers/reportsController.js";

export const reportsRoutes = Router();

reportsRoutes.use(requireAuth);
reportsRoutes.get("/sales-by-customer", getSalesByCustomerReport);
reportsRoutes.get("/sales-by-item", getSalesByItemReport);
