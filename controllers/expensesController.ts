import type express from "express";
import mongoose from "mongoose";
import { Expense } from "../models/Expense.js";

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  return orgId;
};

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

export const listExpenses: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;
  if (req.query.status) filter.status = req.query.status;

  const total = await Expense.countDocuments(filter);
  const rows = await Expense.find(filter).sort({ createdAt: -1 }).lean();

  return res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
};

export const getExpenseById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const row = await Expense.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Expense not found", data: null });

  return res.json({ success: true, data: normalizeRow(row) });
};

export const createExpense: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  try {
    const created = await Expense.create({ ...req.body, organizationId: orgId });
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message, data: null });
  }
};

export const updateExpense: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const updated = await Expense.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Expense not found", data: null });

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteExpense: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const deleted = await Expense.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Expense not found", data: null });

  return res.json({ success: true, data: { id: req.params.id } });
};
