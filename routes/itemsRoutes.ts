import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { createItem, deleteItem, getItemById, listItems, updateItem } from "../controllers/itemsController.js";

export const itemsRoutes = Router();

itemsRoutes.get("/", requireAuth, listItems);
itemsRoutes.post("/", requireAuth, createItem);
itemsRoutes.get("/:id", requireAuth, getItemById);
itemsRoutes.put("/:id", requireAuth, updateItem);
itemsRoutes.delete("/:id", requireAuth, deleteItem);

