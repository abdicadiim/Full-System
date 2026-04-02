import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  bulkCreateProducts,
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  markProductActive,
  markProductInactive,
  updateProduct,
} from "../controllers/productsController.js";

export const productsRoutes = Router();

productsRoutes.get("/", requireAuth, listProducts);
productsRoutes.post("/", requireAuth, createProduct);
productsRoutes.post("/bulk", requireAuth, bulkCreateProducts);
productsRoutes.get("/:product_id", requireAuth, getProductById);
productsRoutes.put("/:product_id", requireAuth, updateProduct);
productsRoutes.delete("/:product_id", requireAuth, deleteProduct);
productsRoutes.post("/:product_id/markasactive", requireAuth, markProductActive);
productsRoutes.post("/:product_id/markasinactive", requireAuth, markProductInactive);
