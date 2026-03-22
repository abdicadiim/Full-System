import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import { bulkCreateCoupons, createCoupon, deleteCoupon, getCouponById, listCoupons, updateCoupon } from "../controllers/couponsController.js";

export const couponsRoutes = Router();

couponsRoutes.get("/", requireAuth, listCoupons);
couponsRoutes.post("/", requireAuth, createCoupon);
couponsRoutes.post("/bulk", requireAuth, bulkCreateCoupons);
couponsRoutes.get("/:id", requireAuth, getCouponById);
couponsRoutes.put("/:id", requireAuth, updateCoupon);
couponsRoutes.delete("/:id", requireAuth, deleteCoupon);
