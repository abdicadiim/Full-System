import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import { createLocation, deleteLocation, getLocationById, listLocations, updateLocation } from "../controllers/locationsController.js";

export const locationsRoutes = Router();

locationsRoutes.get("/", requireAuth, listLocations);
locationsRoutes.get("/:id", requireAuth, getLocationById);
locationsRoutes.post("/", requireAuth, requireOrgAdmin, createLocation);
locationsRoutes.put("/:id", requireAuth, requireOrgAdmin, updateLocation);
locationsRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteLocation);

