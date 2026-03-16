import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const SESSION_COOKIE_NAME = "fs_session";
// Dev-friendly default: bypass auth unless explicitly disabled.
// Set `AUTH_BYPASS=0` in `.env` to enable real auth.
const AUTH_BYPASS = process.env.AUTH_BYPASS !== "0";
if (!MONGODB_URI) {
    // eslint-disable-next-line no-console
    console.warn("Missing MONGODB_URI. Server will start, but DB features will fail.");
}
if (AUTH_BYPASS) {
    // eslint-disable-next-line no-console
    console.warn("AUTH_BYPASS is enabled. Auth endpoints will accept any credentials (dev only).");
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
    origin: true,
    credentials: true,
}));
app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { ok: true, time: new Date().toISOString() } });
});
const UserSchema = new mongoose.Schema({
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
}, { timestamps: true });
const User = mongoose.model("User", UserSchema);
const setSessionCookie = (res, userId) => {
    if (!JWT_SECRET)
        return;
    const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};
const clearSessionCookie = (res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
};
const getAuthedUser = async (req) => {
    if (AUTH_BYPASS) {
        return { id: "dev", name: "Dev User", email: "dev@example.com" };
    }
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token || !JWT_SECRET)
        return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.sub).lean();
        if (!user)
            return null;
        return { id: String(user._id), name: user.name, email: user.email };
    }
    catch {
        return null;
    }
};
app.post("/api/auth/signup", async (req, res) => {
    if (AUTH_BYPASS) {
        const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
        return res.status(201).json({ success: true, data: { id: "dev", name: "Dev User", email } });
    }
    if (!MONGODB_URI)
        return res.status(500).json({ success: false, message: "DB not configured", data: null });
    if (!JWT_SECRET)
        return res.status(500).json({ success: false, message: "JWT_SECRET not configured", data: null });
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required", data: null });
    }
    const exists = await User.findOne({ email }).lean();
    if (exists)
        return res.status(409).json({ success: false, message: "Email already exists", data: null });
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({ name, email, passwordHash });
    setSessionCookie(res, String(created._id));
    return res.status(201).json({ success: true, data: { id: String(created._id), name: created.name, email } });
});
app.post("/api/auth/login", async (req, res) => {
    if (AUTH_BYPASS) {
        const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
        return res.json({ success: true, data: { id: "dev", name: "Dev User", email } });
    }
    if (!MONGODB_URI)
        return res.status(500).json({ success: false, message: "DB not configured", data: null });
    if (!JWT_SECRET)
        return res.status(500).json({ success: false, message: "JWT_SECRET not configured", data: null });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required", data: null });
    }
    const user = await User.findOne({ email }).lean();
    if (!user)
        return res.status(401).json({ success: false, message: "Invalid credentials", data: null });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ success: false, message: "Invalid credentials", data: null });
    setSessionCookie(res, String(user._id));
    return res.json({ success: true, data: { id: String(user._id), name: user.name, email: user.email } });
});
app.post("/api/auth/logout", async (_req, res) => {
    if (AUTH_BYPASS)
        return res.json({ success: true, data: { ok: true } });
    clearSessionCookie(res);
    res.json({ success: true, data: { ok: true } });
});
app.get("/api/auth/me", async (req, res) => {
    const user = await getAuthedUser(req);
    if (!user)
        return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return res.json({ success: true, data: user });
});
// Example Mongo model + routes (minimal)
const InvoiceSchema = new mongoose.Schema({
    number: { type: String, required: true, index: true },
    customerName: { type: String, default: "" },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    status: { type: String, default: "draft" },
}, { timestamps: true });
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
    if (!row)
        return res.status(404).json({ success: false, message: "Not found", data: null });
    res.json({ success: true, data: row });
});
app.put("/api/invoices/:id", async (req, res) => {
    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body || {}, { new: true }).lean();
    if (!updated)
        return res.status(404).json({ success: false, message: "Not found", data: null });
    res.json({ success: true, data: updated });
});
app.delete("/api/invoices/:id", async (req, res) => {
    const deleted = await Invoice.findByIdAndDelete(req.params.id).lean();
    if (!deleted)
        return res.status(404).json({ success: false, message: "Not found", data: null });
    res.json({ success: true, data: deleted });
});
app.use("/api", (_req, res) => {
    res.status(501).json({ success: false, message: "Not implemented", data: null });
});
app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", data: null });
});
const start = async () => {
    if (MONGODB_URI) {
        await mongoose.connect(MONGODB_URI);
    }
    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`API listening on http://localhost:${PORT}`);
    });
};
start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
});
