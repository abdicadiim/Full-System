import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  createItem,
  deleteItem,
  getItemById,
  listItems,
  markItemActive,
  markItemInactive,
  updateItem,
} from "../controllers/itemsController.js";

export const itemsRoutes = Router();

itemsRoutes.get("/", requireAuth, listItems);
itemsRoutes.post("/", requireAuth, createItem);
itemsRoutes.get("/:item_id", requireAuth, getItemById);
itemsRoutes.put("/:item_id", requireAuth, updateItem);
itemsRoutes.delete("/:item_id", requireAuth, deleteItem);
itemsRoutes.post("/:item_id/active", requireAuth, markItemActive);
itemsRoutes.post("/:item_id/inactive", requireAuth, markItemInactive);
