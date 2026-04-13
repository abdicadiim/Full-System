import { Router } from "express";
import { fetchResources, validateResources } from "../controllers/syncController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

export const syncRoutes = Router();

syncRoutes.post("/validate", requireAuth, validateResources);
syncRoutes.post("/fetch", requireAuth, fetchResources);
