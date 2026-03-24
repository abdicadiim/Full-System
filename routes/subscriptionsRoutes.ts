import express from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  listSubscriptions,
  updateSubscription,
} from "../controllers/subscriptionsController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", listSubscriptions);
router.post("/", createSubscription);
router.get("/:id", getSubscriptionById);
router.put("/:id", updateSubscription);
router.delete("/:id", deleteSubscription);

export default router;
