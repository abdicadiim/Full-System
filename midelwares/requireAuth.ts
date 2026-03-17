import express from "express";
import { getAuthedUser, type AuthedUser } from "./auth.js";

declare global {
  // eslint-disable-next-line no-var
  var __fsAuthTypes: never;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

export const requireAuth: express.RequestHandler = async (req, res, next) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  req.user = user;
  next();
};

export const requireOrgAdmin: express.RequestHandler = (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden", data: null });
  next();
};

