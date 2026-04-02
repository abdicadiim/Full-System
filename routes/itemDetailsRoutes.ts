import { Router } from "express";
import { bulkFetchItemDetails } from "../controllers/itemsController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

export const itemDetailsRoutes = Router();

itemDetailsRoutes.get("/", requireAuth, bulkFetchItemDetails);
