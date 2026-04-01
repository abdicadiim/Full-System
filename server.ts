import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { Server } from "node:http";
import mongoose from "mongoose";

import { connectDb } from "./config/db.js";
import { AUTH_BYPASS, FRONTEND_URL, JWT_SECRET, MONGO_URI, PORT } from "./config/env.js";
import { authRoutes } from "./routes/authRoutes.js";
import { organizationRoutes } from "./routes/organizationRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";
import { publicVerificationRoutes } from "./routes/publicVerificationRoutes.js";
import { publicUserInvitationRoutes } from "./routes/publicUserInvitationRoutes.js";
import { reportingTagsRoutes } from "./routes/reportingTagsRoutes.js";
import { rolesRoutes } from "./routes/rolesRoutes.js";
import { usersRoutes } from "./routes/usersRoutes.js";
import { salespersonsRoutes } from "./routes/salespersonsRoutes.js";
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
import invoicesRoutes from "./routes/invoicesRoutes.js";
import expensesRoutes from "./routes/expensesRoutes.js";
import projectsRoutes from "./routes/projectsRoutes.js";
import billsRoutes from "./routes/billsRoutes.js";
import paymentsRoutes from "./routes/paymentsRoutes.js";
import paymentsMadeRoutes from "./routes/paymentsMadeRoutes.js";
import creditNotesRoutes from "./routes/creditNotesRoutes.js";
import recurringInvoicesRoutes from "./routes/recurringInvoicesRoutes.js";
import salesReceiptsRoutes from "./routes/salesReceiptsRoutes.js";
import debitNotesRoutes from "./routes/debitNotesRoutes.js";
import subscriptionsRoutes from "./routes/subscriptionsRoutes.js";
import { reportsRoutes } from "./routes/reportsRoutes.js";
import activityLogsRoutes from "./routes/activityLogsRoutes.js";
import refundsRoutes from "./routes/refundsRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { activityLogger } from "./midelwares/activityLogger.js";

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
let server: Server | null = null;

const shutdownServer = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down API server...`);

  await new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    server.close(() => resolve());
  });

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error while closing Mongo connection:", error);
  }
};

process.once("SIGINT", () => {
  void shutdownServer("SIGINT").finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdownServer("SIGTERM").finally(() => process.exit(0));
});

app.disable("x-powered-by");
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(activityLogger);

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
app.use("/api/public", publicVerificationRoutes);
app.use("/api/public", publicUserInvitationRoutes);
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
app.use("/api/salespersons", salespersonsRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/addons", addonsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/price-lists", priceListsRoutes);
app.use("/api/quotes", quotesRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/payments-received", paymentsRoutes);
app.use("/api/payments-made", paymentsMadeRoutes);
app.use("/api/credit-notes", creditNotesRoutes);
app.use("/api/recurring-invoices", recurringInvoicesRoutes);
app.use("/api/sales-receipts", salesReceiptsRoutes);
app.use("/api/debit-notes", debitNotesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/activity-logs", activityLogsRoutes);
app.use("/api/refunds", refundsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api", (_req, res) => {
  res.status(501).json({ success: false, message: "Not implemented", data: null });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ success: false, message: "Server error", data: null });
});

const start = async () => {
  const dbConnected = await connectDb();
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    // eslint-disable-next-line no-console
    console.error(`Failed to listen on port ${PORT}:`, error);
    process.exitCode = 1;
  });
  if (!dbConnected && !AUTH_BYPASS) {
    // eslint-disable-next-line no-console
    console.warn("API started without a live MongoDB connection. Auth and database-backed routes will return 500 until DB is available.");
  }
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
