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
import invoicesRoutes from "./routes/invoicesRoutes.js";
if (!MONGO_URI) {
    // eslint-disable-next-line no-console
    console.warn("Missing MONGO_URI/MONGODB_URI. Server will start, but DB features will fail.");
}
if (AUTH_BYPASS) {
    // eslint-disable-next-line no-console
    console.warn("AUTH_BYPASS=1 is enabled. Auth endpoints will accept any credentials and WILL NOT create users/orgs in MongoDB (dev only).");
}
else if (!JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn("Missing JWT_SECRET. Auth will not work until you set it in .env.");
}
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(cors({
    origin: FRONTEND_URL || true,
    credentials: true,
}));
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
app.use("/api/invoices", invoicesRoutes);
app.use("/api", (_req, res) => {
    res.status(501).json({ success: false, message: "Not implemented", data: null });
});
app.use((err, _req, res, _next) => {
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
