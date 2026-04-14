"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_js_1 = require("./config/db.js");
const env_js_1 = require("./config/env.js");
const authRoutes_js_1 = require("./routes/authRoutes.js");
const documentsRoutes_js_1 = require("./routes/documentsRoutes.js");
const organizationRoutes_js_1 = require("./routes/organizationRoutes.js");
const settingsRoutes_js_1 = require("./routes/settingsRoutes.js");
const publicVerificationRoutes_js_1 = require("./routes/publicVerificationRoutes.js");
const publicUserInvitationRoutes_js_1 = require("./routes/publicUserInvitationRoutes.js");
const reportingTagsRoutes_js_1 = require("./routes/reportingTagsRoutes.js");
const rolesRoutes_js_1 = require("./routes/rolesRoutes.js");
const usersRoutes_js_1 = require("./routes/usersRoutes.js");
const salespersonsRoutes_js_1 = require("./routes/salespersonsRoutes.js");
const taxesRoutes_js_1 = require("./routes/taxesRoutes.js");
const currenciesRoutes_js_1 = require("./routes/currenciesRoutes.js");
const transactionNumberSeriesRoutes_js_1 = require("./routes/transactionNumberSeriesRoutes.js");
const locationsRoutes_js_1 = require("./routes/locationsRoutes.js");
const customersRoutes_js_1 = require("./routes/customersRoutes.js");
const itemsRoutes_js_1 = require("./routes/itemsRoutes.js");
const itemDetailsRoutes_js_1 = require("./routes/itemDetailsRoutes.js");
const productsRoutes_js_1 = require("./routes/productsRoutes.js");
const plansRoutes_js_1 = require("./routes/plansRoutes.js");
const addonsRoutes_js_1 = require("./routes/addonsRoutes.js");
const couponsRoutes_js_1 = require("./routes/couponsRoutes.js");
const priceListsRoutes_js_1 = __importDefault(require("./routes/priceListsRoutes.js"));
const quotesRoutes_js_1 = __importDefault(require("./routes/quotesRoutes.js"));
const invoicesRoutes_js_1 = __importDefault(require("./routes/invoicesRoutes.js"));
const expensesRoutes_js_1 = __importDefault(require("./routes/expensesRoutes.js"));
const projectsRoutes_js_1 = __importDefault(require("./routes/projectsRoutes.js"));
const billsRoutes_js_1 = __importDefault(require("./routes/billsRoutes.js"));
const paymentsRoutes_js_1 = __importDefault(require("./routes/paymentsRoutes.js"));
const paymentsMadeRoutes_js_1 = __importDefault(require("./routes/paymentsMadeRoutes.js"));
const creditNotesRoutes_js_1 = __importDefault(require("./routes/creditNotesRoutes.js"));
const recurringInvoicesRoutes_js_1 = __importDefault(require("./routes/recurringInvoicesRoutes.js"));
const salesReceiptsRoutes_js_1 = __importDefault(require("./routes/salesReceiptsRoutes.js"));
const debitNotesRoutes_js_1 = __importDefault(require("./routes/debitNotesRoutes.js"));
const subscriptionsRoutes_js_1 = __importDefault(require("./routes/subscriptionsRoutes.js"));
const reportsRoutes_js_1 = require("./routes/reportsRoutes.js");
const activityLogsRoutes_js_1 = __importDefault(require("./routes/activityLogsRoutes.js"));
const refundsRoutes_js_1 = __importDefault(require("./routes/refundsRoutes.js"));
const dashboardRoutes_js_1 = require("./routes/dashboardRoutes.js");
const syncRoutes_js_1 = require("./routes/syncRoutes.js");
const activityLogger_js_1 = require("./midelwares/activityLogger.js");
if (!env_js_1.MONGO_URI) {
    // eslint-disable-next-line no-console
    console.warn("Missing MONGO_URI/MONGODB_URI. Server will start, but DB features will fail.");
}
if (env_js_1.AUTH_BYPASS) {
    // eslint-disable-next-line no-console
    console.warn("AUTH_BYPASS=1 is enabled. Auth endpoints will accept any credentials and WILL NOT create users/orgs in MongoDB (dev only).");
}
else if (!env_js_1.JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn("Missing JWT_SECRET. Auth will not work until you set it in .env.");
}
const app = (0, express_1.default)();
let server = null;
const logServerError = (label, error) => {
    if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(`[${label}] ${error.message}`);
        if (error.stack) {
            // eslint-disable-next-line no-console
            console.error(error.stack);
        }
        return;
    }
    // eslint-disable-next-line no-console
    console.error(`[${label}]`, error);
};
process.on("unhandledRejection", (reason) => {
    logServerError("UnhandledRejection", reason);
});
process.on("uncaughtException", (error) => {
    logServerError("UncaughtException", error);
    process.exit(1);
});
const shutdownServer = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down API server...`);
    await new Promise((resolve) => {
        if (!server) {
            resolve();
            return;
        }
        server.close(() => resolve());
    });
    try {
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.connection.close(false);
        }
    }
    catch (error) {
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
app.use(express_1.default.json({ limit: "50mb" }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: env_js_1.FRONTEND_URL || true,
    credentials: true,
}));
app.use(activityLogger_js_1.activityLogger);
app.get("/api/health", (_req, res) => {
    const readyState = mongoose_1.default.connection.readyState;
    res.json({
        success: true,
        data: {
            ok: true,
            time: new Date().toISOString(),
            db: {
                readyState,
                connected: readyState === 1,
                hasMongoUri: Boolean(env_js_1.MONGO_URI),
            },
        },
    });
});
const requireDbConnection = (_req, res, next) => {
    const readyState = mongoose_1.default.connection.readyState;
    if (readyState === 1) {
        next();
        return;
    }
    res.status(503).json({
        success: false,
        message: env_js_1.MONGO_URI
            ? "Database unavailable. Check the MongoDB connection string or network/DNS access."
            : "Database not configured. Set MONGO_URI or MONGODB_URI.",
        data: {
            readyState,
            connected: false,
            hasMongoUri: Boolean(env_js_1.MONGO_URI),
        },
    });
};
app.use("/api/auth", authRoutes_js_1.authRoutes);
app.use("/api/documents", documentsRoutes_js_1.documentsRoutes);
app.use("/api/public", publicVerificationRoutes_js_1.publicVerificationRoutes);
app.use("/api/public", publicUserInvitationRoutes_js_1.publicUserInvitationRoutes);
app.use("/api", requireDbConnection);
app.use("/api/organizations", organizationRoutes_js_1.organizationRoutes);
app.use("/api/settings", settingsRoutes_js_1.settingsRoutes);
app.use("/api/reporting-tags", reportingTagsRoutes_js_1.reportingTagsRoutes);
app.use("/api/roles", rolesRoutes_js_1.rolesRoutes);
app.use("/api/users", usersRoutes_js_1.usersRoutes);
app.use("/api/taxes", taxesRoutes_js_1.taxesRoutes);
app.use("/api/currencies", currenciesRoutes_js_1.currenciesRoutes);
app.use("/api/transaction-number-series", transactionNumberSeriesRoutes_js_1.transactionNumberSeriesRoutes);
app.use("/api/locations", locationsRoutes_js_1.locationsRoutes);
app.use("/api/customers", customersRoutes_js_1.customersRoutes);
app.use("/api/contacts", customersRoutes_js_1.customersRoutes);
app.use("/api/salespersons", salespersonsRoutes_js_1.salespersonsRoutes);
app.use("/api/items", itemsRoutes_js_1.itemsRoutes);
app.use("/api/itemdetails", itemDetailsRoutes_js_1.itemDetailsRoutes);
app.use("/api/products", productsRoutes_js_1.productsRoutes);
app.use("/api/plans", plansRoutes_js_1.plansRoutes);
app.use("/api/addons", addonsRoutes_js_1.addonsRoutes);
app.use("/api/coupons", couponsRoutes_js_1.couponsRoutes);
app.use("/api/price-lists", priceListsRoutes_js_1.default);
app.use("/api/quotes", quotesRoutes_js_1.default);
app.use("/api/invoices", invoicesRoutes_js_1.default);
app.use("/api/expenses", expensesRoutes_js_1.default);
app.use("/api/projects", projectsRoutes_js_1.default);
app.use("/api/bills", billsRoutes_js_1.default);
app.use("/api/payments-received", paymentsRoutes_js_1.default);
app.use("/api/payments-made", paymentsMadeRoutes_js_1.default);
app.use("/api/credit-notes", creditNotesRoutes_js_1.default);
app.use("/api/recurring-invoices", recurringInvoicesRoutes_js_1.default);
app.use("/api/sales-receipts", salesReceiptsRoutes_js_1.default);
app.use("/api/debit-notes", debitNotesRoutes_js_1.default);
app.use("/api/subscriptions", subscriptionsRoutes_js_1.default);
app.use("/api/reports", reportsRoutes_js_1.reportsRoutes);
app.use("/api/activity-logs", activityLogsRoutes_js_1.default);
app.use("/api/refunds", refundsRoutes_js_1.default);
app.use("/api/dashboard", dashboardRoutes_js_1.dashboardRoutes);
app.use("/api/sync", syncRoutes_js_1.syncRoutes);
app.use("/api", (_req, res) => {
    res.status(501).json({ success: false, message: "Not implemented", data: null });
});
app.use((err, _req, res, _next) => {
    logServerError("ExpressError", err);
    res.status(500).json({ success: false, message: "Server error", data: null });
});
const start = async () => {
    const dbConnected = await (0, db_js_1.connectDb)();
    server = app.listen(env_js_1.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`API listening on http://localhost:${env_js_1.PORT}`);
    });
    server.on("error", (error) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to listen on port ${env_js_1.PORT}:`, error);
        process.exitCode = 1;
    });
    if (!dbConnected && !env_js_1.AUTH_BYPASS) {
        // eslint-disable-next-line no-console
        console.warn("API started without a live MongoDB connection. Auth and database-backed routes will return 500 until DB is available.");
    }
};
start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
});
