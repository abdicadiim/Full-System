import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import { createCurrency, deleteCurrency, getCurrencyById, listCurrencies, updateCurrency } from "../controllers/currenciesController.js";

export const currenciesRoutes = Router();

currenciesRoutes.get("/", requireAuth, listCurrencies);
currenciesRoutes.get("/:id", requireAuth, getCurrencyById);
currenciesRoutes.post("/", requireAuth, requireOrgAdmin, createCurrency);
currenciesRoutes.put("/:id", requireAuth, requireOrgAdmin, updateCurrency);
currenciesRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteCurrency);

