import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import mongoose from "mongoose";

import { connectDb } from "./config/db.js";
import { AUTH_BYPASS, FRONTEND_URL, JWT_SECRET, MONGO_URI, PORT } from "./config/env.js";
import { authRoutes } from "./routes/authRoutes.js";
import { organizationRoutes } from "./routes/organizationRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";
import { reportingTagsRoutes } from "./routes/reportingTagsRoutes.js";
import { rolesRoutes } from "./routes/rolesRoutes.js";
import { usersRoutes } from "./routes/usersRoutes.js";
import { taxesRoutes } from "./routes/taxesRoutes.js";
import { currenciesRoutes } from "./routes/currenciesRoutes.js";
import { transactionNumberSeriesRoutes } from "./routes/transactionNumberSeriesRoutes.js";
import { locationsRoutes } from "./routes/locationsRoutes.js";
import { customersRoutes } from "./routes/customersRoutes.js";
import { itemsRoutes } from "./routes/itemsRoutes.js";
import { productsRoutes } from "./routes/productsRoutes.js";
import { plansRoutes } from "./routes/plansRoutes.js";
import { addonsRoutes } from "./routes/addonsRoutes.js";
import { couponsRoutes } from "./routes/couponsRoutes.js";
import priceListsRoutes from "./routes/priceListsRoutes.js";
import quotesRoutes from "./routes/quotesRoutes.js";

if (!MONGO_URI) {
  // eslint-disable-next-line no-console
  console.warn("Missing MONGO_URI/MONGODB_URI. Server will start, but DB features will fail.");
}
if (AUTH_BYPASS) {
  // eslint-disable-next-line no-console
  console.warn(
    "AUTH_BYPASS=1 is enabled. Auth endpoints will accept any credentials and WILL NOT create users/orgs in MongoDB (dev only)."
  );
} else if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn("Missing JWT_SECRET. Auth will not work until you set it in .env.");
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_URL || true,
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => {
  const readyState = mongoose.connection.readyState;
  res.json({
    success: true,
    data: {
      ok: true,
      time: new Date().toISOString(),
      db: {
        readyState,
        connected: readyState === 1,
        hasMongoUri: Boolean(MONGO_URI),
      },
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reporting-tags", reportingTagsRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/taxes", taxesRoutes);
app.use("/api/currencies", currenciesRoutes);
app.use("/api/transaction-number-series", transactionNumberSeriesRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/addons", addonsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/price-lists", priceListsRoutes);
app.use("/api/quotes", quotesRoutes);

// Example Mongo model + routes (minimal)
const InvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, index: true },
    customerName: { type: String, default: "" },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    status: { type: String, default: "draft" },
  },
  { timestamps: true }
);
const Invoice = mongoose.model("Invoice", InvoiceSchema);

app.get("/api/invoices", async (_req, res) => {
  const rows = await Invoice.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: rows });
});

app.post("/api/invoices", async (req, res) => {
  const created = await Invoice.create(req.body || {});
  res.status(201).json({ success: true, data: created });
});

app.get("/api/invoices/:id", async (req, res) => {
  const row = await Invoice.findById(req.params.id).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: row });
});

app.put("/api/invoices/:id", async (req, res) => {
  const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body || {}, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: updated });
});

app.delete("/api/invoices/:id", async (req, res) => {
  const deleted = await Invoice.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: deleted });
});

app.use("/api", (_req, res) => {
  res.status(501).json({ success: false, message: "Not implemented", data: null });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ success: false, message: "Server error", data: null });
});

const start = async () => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
  await connectDb();
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
