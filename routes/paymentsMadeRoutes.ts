import express from "express";
import { PaymentMade } from "../models/PaymentMade.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  if (req.query.billId) filter.billId = req.query.billId;
  const total = await PaymentMade.countDocuments(filter);
  const rows = await PaymentMade.find(filter).sort({ date: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
});

router.post("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const created = await PaymentMade.create({ ...req.body, organizationId: orgId });
  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

router.get("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const row = await PaymentMade.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const updated = await PaymentMade.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  await PaymentMade.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  res.json({ success: true, data: { id: req.params.id } });
});

export default router;
