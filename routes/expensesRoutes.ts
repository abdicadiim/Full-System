import express from "express";
import { Expense } from "../models/Expense.js";
import { RecurringExpense } from "../models/RecurringExpense.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;
  const total = await Expense.countDocuments(filter);
  const rows = await Expense.find(filter).sort({ date: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
});

router.post("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const created = await Expense.create({ ...req.body, organizationId: orgId });
  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

// Recurring expenses
router.get("/recurring", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;
  const rows = await RecurringExpense.find(filter).lean();
  res.json({ success: true, data: rows.map(normalizeRow) });
});

router.post("/recurring", async (req, res) => {
  const orgId = req.user?.organizationId;
  const created = await RecurringExpense.create({ ...req.body, organizationId: orgId });
  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

router.get("/recurring/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const row = await RecurringExpense.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/recurring/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const updated = await RecurringExpense.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/recurring/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  await RecurringExpense.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  res.json({ success: true, data: { id: req.params.id } });
});

// Regular expenses
router.get("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const row = await Expense.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const updated = await Expense.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  await Expense.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  res.json({ success: true, data: { id: req.params.id } });
});

export default router;
