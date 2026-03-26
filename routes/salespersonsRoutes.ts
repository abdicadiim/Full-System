import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  createSalesperson,
  deleteSalesperson,
  getSalespersonById,
  listSalespersons,
  updateSalesperson,
} from "../controllers/salespersonsController.js";

export const salespersonsRoutes = Router();

salespersonsRoutes.get("/", requireAuth, listSalespersons);
salespersonsRoutes.post("/", requireAuth, createSalesperson);
salespersonsRoutes.get("/:id", requireAuth, getSalespersonById);
salespersonsRoutes.put("/:id", requireAuth, updateSalesperson);
salespersonsRoutes.delete("/:id", requireAuth, deleteSalesperson);
