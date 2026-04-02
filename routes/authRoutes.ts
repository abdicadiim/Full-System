import { Router } from "express";
import {
  checkEmailExists,
  login,
  logout,
  me,
  requestLoginOtp,
  requestPasswordReset,
  resetPasswordWithCode,
  verifyPasswordResetCode,
  signup,
  updateMe,
  verifyLoginOtp,
} from "../controllers/authController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

export const authRoutes = Router();

authRoutes.post("/check-email", checkEmailExists);
authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.post("/login/email-otp", requestLoginOtp);
authRoutes.post("/login/email-otp/verify", verifyLoginOtp);
authRoutes.post("/password/reset-request", requestPasswordReset);
authRoutes.post("/password/reset-verify", verifyPasswordResetCode);
authRoutes.post("/password/reset", resetPasswordWithCode);
authRoutes.post("/logout", logout);
authRoutes.get("/me", me);
authRoutes.patch("/me", requireAuth, updateMe);
