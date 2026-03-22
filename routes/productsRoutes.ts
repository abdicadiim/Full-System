import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { createProduct, deleteProduct, getProductById, listProducts, updateProduct } from "../controllers/productsController.js";

export const productsRoutes = Router();

productsRoutes.get("/", requireAuth, listProducts);
productsRoutes.post("/", requireAuth, createProduct);
productsRoutes.get("/:id", requireAuth, getProductById);
productsRoutes.put("/:id", requireAuth, updateProduct);
productsRoutes.delete("/:id", requireAuth, deleteProduct);

