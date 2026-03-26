import type express from "express";
import mongoose from "mongoose";
import { Salesperson } from "../models/Salesperson.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

export const listSalespersons: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const q = asString(req.query.search ?? req.query.q).trim();
    const status = asString(req.query.status).trim().toLowerCase();
    const limit = Math.max(0, Number(req.query.limit || 0));
    const page = Math.max(1, Number(req.query.page || 1));

    const filter: any = { organizationId: orgId };
    if (status) filter.status = new RegExp(`^${escapeRegExp(status)}$`, "i");
    if (q) {
      const re = new RegExp(escapeRegExp(q), "i");
      filter.$or = [{ name: re }, { email: re }];
    }

    const total = await Salesperson.countDocuments(filter);
    let query = Salesperson.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
    const rows = await query.lean();

    res.json({
      success: true,
      data: rows,
      total,
      page,
      limit: limit || total,
      totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getSalespersonById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const row = await Salesperson.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Salesperson not found", data: null });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

export const createSalesperson: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const payload = (req.body || {}) as Record<string, unknown>;
    const created = await Salesperson.create({ ...payload, organizationId: orgId });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateSalesperson: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const updated = await Salesperson.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { $set: { ...(req.body || {}) } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Salesperson not found", data: null });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSalesperson: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const deleted = await Salesperson.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Salesperson not found", data: null });
    res.json({ success: true, data: { id: String(deleted._id) } });
  } catch (err) {
    next(err);
  }
};
