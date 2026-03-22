import express from "express";
import {
  listPriceLists,
  getPriceListById,
  createPriceList,
  updatePriceList,
  deletePriceList,
} from "../controllers/priceListsController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listPriceLists);
router.get("/:id", getPriceListById);
router.post("/", createPriceList);
router.put("/:id", updatePriceList);
router.delete("/:id", deletePriceList);

export default router;
