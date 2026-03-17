import { Router } from "express";
import { login, logout, me, signup, updateMe } from "../controllers/authController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

export const authRoutes = Router();

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", me);
authRoutes.patch("/me", requireAuth, updateMe);
