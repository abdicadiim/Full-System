import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { bulkCreateAddons, createAddon, deleteAddon, getAddonById, listAddons, updateAddon } from "../controllers/addonsController.js";

export const addonsRoutes = Router();

addonsRoutes.get("/", requireAuth, listAddons);
addonsRoutes.post("/", requireAuth, createAddon);
addonsRoutes.post("/bulk", requireAuth, bulkCreateAddons);
addonsRoutes.get("/:id", requireAuth, getAddonById);
addonsRoutes.put("/:id", requireAuth, updateAddon);
addonsRoutes.delete("/:id", requireAuth, deleteAddon);
