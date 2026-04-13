"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTaxComplianceSettingsLocal = exports.readTaxComplianceSettingsLocal = exports.getAssociatedRecordsLocal = exports.deleteTaxesLocal = exports.markDefaultTaxLocal = exports.updateTaxLocal = exports.createTaxLocal = exports.getTaxByIdLocal = exports.syncTaxesFromBackend = exports.writeTaxesLocal = exports.readTaxesLocal = exports.isTaxGroupRecord = exports.TAX_SETTINGS_STORAGE_EVENT = exports.TAXES_STORAGE_EVENT = exports.TAX_GROUP_MARKER = void 0;
exports.TAX_GROUP_MARKER = "__taban_tax_group__";
var TAXES_STORAGE_KEY = "taban_settings_taxes_v1";
var LEGACY_TAXES_STORAGE_KEY = "taban_books_taxes";
var TAX_SETTINGS_STORAGE_KEY = "taban_settings_tax_compliance_v1";
exports.TAXES_STORAGE_EVENT = "taban:taxes-storage-updated";
exports.TAX_SETTINGS_STORAGE_EVENT = "taban:tax-settings-storage-updated";
var DEFAULT_TAX_SETTINGS = {
    taxRegistrationLabel: "PIN",
    taxRegistrationNumber: "",
    enableUseTaxInPurchases: false,
    enableTDS: false,
    tdsFor: "Customers",
    enableTDSOverride: false,
    enableReverseChargeSales: false,
    enableReverseChargePurchase: false,
    taxTrackingAccount: "single",
    overrideTaxSales: false,
    overrideTaxPurchases: false,
    enableVATMOSS: false,
    eoriNumber: "",
    salesTaxDisabled: false,
};
var safeParse = function (raw, fallback) {
    if (!raw)
        return fallback;
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return fallback;
    }
};
var nowIso = function () { return new Date().toISOString(); };
var createId = function () {
    return "tax-".concat(Date.now().toString(36), "-").concat(Math.random().toString(36).slice(2, 8));
};
var isTaxGroupRecord = function (tax) {
    if (!tax)
        return false;
    return (tax.description === exports.TAX_GROUP_MARKER ||
        (Array.isArray(tax.groupTaxes) && tax.groupTaxes.length > 0));
};
exports.isTaxGroupRecord = isTaxGroupRecord;
var normalizeTaxRecord = function (row) {
    var id = String((row === null || row === void 0 ? void 0 : row._id) || (row === null || row === void 0 ? void 0 : row.id) || "").trim();
    var name = String((row === null || row === void 0 ? void 0 : row.name) || "").trim();
    if (!id || !name)
        return null;
    var createdAt = String((row === null || row === void 0 ? void 0 : row.createdAt) || "") || nowIso();
    var updatedAt = String((row === null || row === void 0 ? void 0 : row.updatedAt) || "") || createdAt;
    return {
        _id: id,
        name: name,
        rate: Number((row === null || row === void 0 ? void 0 : row.rate) || 0),
        type: (row === null || row === void 0 ? void 0 : row.type) || "both",
        description: (row === null || row === void 0 ? void 0 : row.description) || "",
        groupTaxes: Array.isArray(row === null || row === void 0 ? void 0 : row.groupTaxes)
            ? row.groupTaxes.map(function (taxId) { return String(taxId); })
            : [],
        isActive: (row === null || row === void 0 ? void 0 : row.isActive) !== false,
        isDefault: !!(row === null || row === void 0 ? void 0 : row.isDefault),
        isCompound: !!(row === null || row === void 0 ? void 0 : row.isCompound),
        isDigitalServiceTax: !!(row === null || row === void 0 ? void 0 : row.isDigitalServiceTax),
        digitalServiceCountry: String((row === null || row === void 0 ? void 0 : row.digitalServiceCountry) || ""),
        trackTaxByCountryScheme: !!(row === null || row === void 0 ? void 0 : row.trackTaxByCountryScheme),
        accountToTrackSales: String((row === null || row === void 0 ? void 0 : row.accountToTrackSales) || ""),
        accountToTrackPurchases: String((row === null || row === void 0 ? void 0 : row.accountToTrackPurchases) || ""),
        isValueAddedTax: !!(row === null || row === void 0 ? void 0 : row.isValueAddedTax),
        createdAt: createdAt,
        updatedAt: updatedAt,
    };
};
var ensureDefaultTax = function (rows) {
    var normalized = rows.map(function (row) { return (__assign(__assign({}, row), { isDefault: (0, exports.isTaxGroupRecord)(row) ? false : !!row.isDefault })); });
    var hasDefault = normalized.some(function (row) { return !(0, exports.isTaxGroupRecord)(row) && row.isDefault; });
    if (hasDefault)
        return normalized;
    var firstTaxIndex = normalized.findIndex(function (row) { return !(0, exports.isTaxGroupRecord)(row); });
    if (firstTaxIndex >= 0) {
        normalized[firstTaxIndex] = __assign(__assign({}, normalized[firstTaxIndex]), { isDefault: true });
    }
    return normalized;
};
var emitStorageEvent = function (eventName) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(eventName));
    }
};
var syncLegacyTaxesKey = function (rows) {
    var legacyRows = rows
        .filter(function (row) { return !(0, exports.isTaxGroupRecord)(row); })
        .map(function (row) { return ({
        id: row._id,
        _id: row._id,
        name: row.name,
        rate: row.rate,
        type: row.type || "both",
        isCompound: !!row.isCompound,
        isDefault: !!row.isDefault,
        isActive: row.isActive !== false,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }); });
    localStorage.setItem(LEGACY_TAXES_STORAGE_KEY, JSON.stringify(legacyRows));
};
var readTaxesLocal = function () {
    var currentRows = safeParse(localStorage.getItem(TAXES_STORAGE_KEY), [])
        .map(normalizeTaxRecord)
        .filter(Boolean);
    if (currentRows.length > 0) {
        return ensureDefaultTax(currentRows);
    }
    var legacyRows = safeParse(localStorage.getItem(LEGACY_TAXES_STORAGE_KEY), [])
        .map(function (row) {
        return normalizeTaxRecord(__assign(__assign({}, row), { _id: (row === null || row === void 0 ? void 0 : row._id) || (row === null || row === void 0 ? void 0 : row.id) || createId() }));
    })
        .filter(Boolean);
    if (legacyRows.length === 0) {
        return [];
    }
    var migrated = ensureDefaultTax(legacyRows);
    localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(migrated));
    syncLegacyTaxesKey(migrated);
    return migrated;
};
exports.readTaxesLocal = readTaxesLocal;
var writeTaxesLocal = function (rows) {
    var normalized = ensureDefaultTax(rows
        .map(normalizeTaxRecord)
        .filter(Boolean)
        .map(function (row) { return (__assign(__assign({}, row), { updatedAt: nowIso() })); }));
    localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(normalized));
    syncLegacyTaxesKey(normalized);
    emitStorageEvent(exports.TAXES_STORAGE_EVENT);
};
exports.writeTaxesLocal = writeTaxesLocal;
var writeTaxesLocalFromBackend = function (rows) {
    var normalized = ensureDefaultTax(rows
        .map(normalizeTaxRecord)
        .filter(Boolean));
    localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(normalized));
    syncLegacyTaxesKey(normalized);
    emitStorageEvent(exports.TAXES_STORAGE_EVENT);
};
var taxesSyncInFlight = null;
var syncTaxesFromBackend = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (taxesSyncInFlight)
            return [2 /*return*/, taxesSyncInFlight];
        taxesSyncInFlight = (function () { return __awaiter(void 0, void 0, void 0, function () {
            var res, json, list, mapped, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, 4, 5]);
                        return [4 /*yield*/, fetch("/api/taxes", { credentials: "include" })];
                    case 1:
                        res = _b.sent();
                        if (!res.ok)
                            return [2 /*return*/];
                        return [4 /*yield*/, res.json().catch(function () { return null; })];
                    case 2:
                        json = _b.sent();
                        list = Array.isArray(json === null || json === void 0 ? void 0 : json.data) ? json.data : [];
                        if (!(json === null || json === void 0 ? void 0 : json.success))
                            return [2 /*return*/];
                        mapped = list.map(function (row) { return ({
                            _id: String((row === null || row === void 0 ? void 0 : row._id) || (row === null || row === void 0 ? void 0 : row.id) || ""),
                            id: String((row === null || row === void 0 ? void 0 : row._id) || (row === null || row === void 0 ? void 0 : row.id) || ""),
                            name: String((row === null || row === void 0 ? void 0 : row.name) || ""),
                            rate: Number((row === null || row === void 0 ? void 0 : row.rate) || 0),
                            type: String((row === null || row === void 0 ? void 0 : row.type) || "both"),
                            description: String((row === null || row === void 0 ? void 0 : row.kind) || "") === "group" ? exports.TAX_GROUP_MARKER : String((row === null || row === void 0 ? void 0 : row.description) || ""),
                            groupTaxes: Array.isArray(row === null || row === void 0 ? void 0 : row.groupTaxes) ? row.groupTaxes.map(function (x) { return String(x); }) : [],
                            isActive: (row === null || row === void 0 ? void 0 : row.isActive) !== false,
                            isDefault: !!(row === null || row === void 0 ? void 0 : row.isDefault),
                            isCompound: !!(row === null || row === void 0 ? void 0 : row.isCompound),
                            isDigitalServiceTax: !!(row === null || row === void 0 ? void 0 : row.isDigitalServiceTax),
                            digitalServiceCountry: String((row === null || row === void 0 ? void 0 : row.digitalServiceCountry) || ""),
                            trackTaxByCountryScheme: !!(row === null || row === void 0 ? void 0 : row.trackTaxByCountryScheme),
                            accountToTrackSales: String((row === null || row === void 0 ? void 0 : row.accountToTrackSales) || ""),
                            accountToTrackPurchases: String((row === null || row === void 0 ? void 0 : row.accountToTrackPurchases) || ""),
                            isValueAddedTax: !!(row === null || row === void 0 ? void 0 : row.isValueAddedTax),
                            createdAt: String((row === null || row === void 0 ? void 0 : row.createdAt) || ""),
                            updatedAt: String((row === null || row === void 0 ? void 0 : row.updatedAt) || ""),
                        }); });
                        writeTaxesLocalFromBackend(mapped);
                        return [3 /*break*/, 5];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        taxesSyncInFlight = null;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); })();
        return [2 /*return*/, taxesSyncInFlight];
    });
}); };
exports.syncTaxesFromBackend = syncTaxesFromBackend;
var apiUpsertTax = function (tax) { return __awaiter(void 0, void 0, void 0, function () {
    var isGroup, payload, existing, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                isGroup = (0, exports.isTaxGroupRecord)(tax);
                payload = {
                    _id: tax._id,
                    kind: isGroup ? "group" : "tax",
                    name: tax.name,
                    rate: Number(tax.rate || 0),
                    type: tax.type || "both",
                    description: isGroup ? "" : String(tax.description || ""),
                    groupTaxes: isGroup ? (tax.groupTaxes || []).map(String) : [],
                    isActive: tax.isActive !== false,
                    isDefault: !!tax.isDefault,
                    isCompound: !!tax.isCompound,
                    isDigitalServiceTax: !!tax.isDigitalServiceTax,
                    digitalServiceCountry: String(tax.digitalServiceCountry || ""),
                    trackTaxByCountryScheme: !!tax.trackTaxByCountryScheme,
                    accountToTrackSales: String(tax.accountToTrackSales || ""),
                    accountToTrackPurchases: String(tax.accountToTrackPurchases || ""),
                    isValueAddedTax: !!tax.isValueAddedTax,
                };
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, fetch("/api/taxes/".concat(encodeURIComponent(tax._id)), { credentials: "include" })];
            case 2:
                existing = _c.sent();
                if (!existing.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, fetch("/api/taxes/".concat(encodeURIComponent(tax._id)), {
                        method: "PUT",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    })];
            case 3:
                _c.sent();
                return [2 /*return*/];
            case 4: return [3 /*break*/, 6];
            case 5:
                _a = _c.sent();
                return [3 /*break*/, 6];
            case 6:
                _c.trys.push([6, 8, , 9]);
                return [4 /*yield*/, fetch("/api/taxes", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    })];
            case 7:
                _c.sent();
                return [3 /*break*/, 9];
            case 8:
                _b = _c.sent();
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); };
var getTaxByIdLocal = function (taxId) {
    return (0, exports.readTaxesLocal)().find(function (row) { return String(row._id) === String(taxId); }) || null;
};
exports.getTaxByIdLocal = getTaxByIdLocal;
var createTaxLocal = function (payload) {
    var rows = (0, exports.readTaxesLocal)();
    var created = {
        _id: createId(),
        name: String(payload.name || "").trim(),
        rate: Number(payload.rate || 0),
        type: payload.type || "both",
        description: payload.description || "",
        groupTaxes: Array.isArray(payload.groupTaxes)
            ? payload.groupTaxes.map(function (taxId) { return String(taxId); })
            : [],
        isActive: payload.isActive !== false,
        isDefault: !!payload.isDefault,
        isCompound: !!payload.isCompound,
        isDigitalServiceTax: !!payload.isDigitalServiceTax,
        digitalServiceCountry: String(payload.digitalServiceCountry || ""),
        trackTaxByCountryScheme: !!payload.trackTaxByCountryScheme,
        accountToTrackSales: String(payload.accountToTrackSales || ""),
        accountToTrackPurchases: String(payload.accountToTrackPurchases || ""),
        isValueAddedTax: !!payload.isValueAddedTax,
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
    var nextRows = __spreadArray([], rows, true);
    if (created.isDefault && !(0, exports.isTaxGroupRecord)(created)) {
        nextRows.forEach(function (row) {
            if (!(0, exports.isTaxGroupRecord)(row))
                row.isDefault = false;
        });
    }
    nextRows.unshift(created);
    (0, exports.writeTaxesLocal)(nextRows);
    void apiUpsertTax(created).then(function () { return (0, exports.syncTaxesFromBackend)(); });
    return created;
};
exports.createTaxLocal = createTaxLocal;
var updateTaxLocal = function (taxId, payload) {
    var rows = (0, exports.readTaxesLocal)();
    var updatedTax = null;
    var updatedRows = rows.map(function (row) {
        var _a, _b;
        if (String(row._id) !== String(taxId))
            return row;
        var next = __assign(__assign(__assign({}, row), payload), { _id: row._id, name: String((_a = payload.name) !== null && _a !== void 0 ? _a : row.name).trim(), rate: Number((_b = payload.rate) !== null && _b !== void 0 ? _b : row.rate), groupTaxes: Array.isArray(payload.groupTaxes)
                ? payload.groupTaxes.map(function (id) { return String(id); })
                : row.groupTaxes || [], updatedAt: nowIso() });
        updatedTax = next;
        return next;
    });
    if (!updatedTax)
        return null;
    if (updatedTax.isDefault && !(0, exports.isTaxGroupRecord)(updatedTax)) {
        updatedRows.forEach(function (row) {
            if (!(0, exports.isTaxGroupRecord)(row))
                row.isDefault = String(row._id) === String(taxId);
        });
    }
    (0, exports.writeTaxesLocal)(updatedRows);
    void apiUpsertTax(updatedTax).then(function () { return (0, exports.syncTaxesFromBackend)(); });
    return updatedTax;
};
exports.updateTaxLocal = updateTaxLocal;
var markDefaultTaxLocal = function (taxId) {
    var rows = (0, exports.readTaxesLocal)();
    var target = rows.find(function (row) { return String(row._id) === String(taxId); });
    if (!target || (0, exports.isTaxGroupRecord)(target))
        return null;
    rows.forEach(function (row) {
        if (!(0, exports.isTaxGroupRecord)(row)) {
            row.isDefault = String(row._id) === String(taxId);
            row.updatedAt = nowIso();
        }
    });
    (0, exports.writeTaxesLocal)(rows);
    var updated = rows.find(function (row) { return String(row._id) === String(taxId); }) || null;
    if (updated)
        void apiUpsertTax(updated).then(function () { return (0, exports.syncTaxesFromBackend)(); });
    return rows.find(function (row) { return String(row._id) === String(taxId); }) || null;
};
exports.markDefaultTaxLocal = markDefaultTaxLocal;
var deleteTaxesLocal = function (ids) {
    var idSet = new Set(ids.map(function (id) { return String(id); }));
    var current = (0, exports.readTaxesLocal)();
    var nextRows = current
        .filter(function (row) { return !idSet.has(String(row._id)); })
        .map(function (row) { return (__assign(__assign({}, row), { groupTaxes: (row.groupTaxes || []).filter(function (taxId) { return !idSet.has(String(taxId)); }) })); });
    var deletedCount = current.length - nextRows.length;
    (0, exports.writeTaxesLocal)(nextRows);
    ids.forEach(function (id) {
        void fetch("/api/taxes/".concat(encodeURIComponent(String(id))), { method: "DELETE", credentials: "include" }).catch(function () { return undefined; });
    });
    void (0, exports.syncTaxesFromBackend)();
    return deletedCount;
};
exports.deleteTaxesLocal = deleteTaxesLocal;
var getAssociatedRecordsLocal = function (taxId) {
    var rows = (0, exports.readTaxesLocal)();
    var tax = rows.find(function (row) { return String(row._id) === String(taxId); });
    if (!tax) {
        return { exactMatches: [], rateMatches: [] };
    }
    if ((0, exports.isTaxGroupRecord)(tax)) {
        return {
            exactMatches: [{ module: "Associated Taxes", count: (tax.groupTaxes || []).length }],
            rateMatches: [],
        };
    }
    var usedInGroups = rows.filter(function (row) {
        return (0, exports.isTaxGroupRecord)(row) && (row.groupTaxes || []).some(function (id) { return String(id) === String(taxId); });
    }).length;
    var sameRate = rows.filter(function (row) { return String(row._id) !== String(taxId) && Number(row.rate || 0) === Number(tax.rate || 0); }).length;
    return {
        exactMatches: usedInGroups > 0 ? [{ module: "Tax Groups", count: usedInGroups }] : [],
        rateMatches: sameRate > 0 ? [{ module: "Other Taxes", count: sameRate }] : [],
    };
};
exports.getAssociatedRecordsLocal = getAssociatedRecordsLocal;
var readTaxComplianceSettingsLocal = function () {
    var parsed = safeParse(localStorage.getItem(TAX_SETTINGS_STORAGE_KEY), {});
    return __assign(__assign(__assign({}, DEFAULT_TAX_SETTINGS), parsed), { taxTrackingAccount: parsed.taxTrackingAccount === "separate" ? "separate" : "single" });
};
exports.readTaxComplianceSettingsLocal = readTaxComplianceSettingsLocal;
var writeTaxComplianceSettingsLocal = function (settings) {
    var next = __assign(__assign(__assign({}, (0, exports.readTaxComplianceSettingsLocal)()), settings), { taxTrackingAccount: settings.taxTrackingAccount === "separate" ? "separate" : "single" });
    localStorage.setItem(TAX_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    emitStorageEvent(exports.TAX_SETTINGS_STORAGE_EVENT);
    return next;
};
exports.writeTaxComplianceSettingsLocal = writeTaxComplianceSettingsLocal;
