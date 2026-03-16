import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ThreePhaseImportWizard, { ImportFieldDef, ImportMappedRecord } from "../../shared/ThreePhaseImportWizard";
import { normalizeAddon, readAddons, writeAddons } from "../storage";

const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "product", label: "Product Name", required: true, aliases: ["product", "product name"] },
  { key: "addonName", label: "Addon Name", required: true, aliases: ["addon name", "name"] },
  { key: "addonCode", label: "Addon Code", required: true, aliases: ["addon code", "code"] },
  { key: "description", label: "Description", aliases: ["description", "addon description"] },
  { key: "addonType", label: "Addon Type", aliases: ["addon type", "type"] },
  { key: "status", label: "Status Formatted", aliases: ["status", "status formatted"] },
  { key: "unit", label: "Unit Name", aliases: ["unit", "unit name"] },
  { key: "billingFrequency", label: "Billing Interval Formatted", aliases: ["billing frequency", "billing interval", "billing interval formatted"] },
  { key: "pricingModel", label: "Pricing Scheme", aliases: ["pricing model", "pricing scheme", "scheme"] },
  { key: "startingQuantity", label: "Starting Quantity", aliases: ["starting quantity"] },
  { key: "endingQuantity", label: "Ending Quantity", aliases: ["ending quantity"] },
];

const SAMPLE_HEADERS = [
  "Product Name", "Addon Name", "Addon Code", "Description",
  "Addon Type", "Status Formatted", "Unit Name", "Billing Interval Formatted",
  "Pricing Scheme", "Starting Quantity", "Ending Quantity"
];
const SAMPLE_ROWS = [
  ["Cloud Box", "Additional Storage", "ADDSTR007", "Increase your storage size upto 10 GB", "One time", "Active", "GB", "Months", "volume", "1", ""],
  ["Cloud Box", "Additional Storage", "ADDSTR007", "Increase your storage size upto 10 GB", "One time", "Active", "GB", "Months", "volume", "6", ""],
  ["Cloud Box", "Additional Users", "ADDUSR013", "Increase your workforce to get more working hands", "One time", "Active", "Users", "Weeks", "package", "", ""],
];

const toNum = (value: string, fallback = 0) => {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

export default function ImportAddonsPage() {
  const navigate = useNavigate();

  const handleImport = (rows: ImportMappedRecord[]) => {
    try {
      const existing = readAddons();
      const prepared = rows.map((row) =>
        normalizeAddon({
          id: `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          product: row.product || "",
          addonName: row.addonName || "",
          addonCode: row.addonCode || "",
          description: row.description || "",
          status: row.status || "Active",
          pricingModel: row.pricingModel || "volume",
          addonType: row.addonType || "One time",
          unit: row.unit || "",
          billingFrequency: row.billingFrequency || "Months",
          startingQuantity: row.startingQuantity || "",
          endingQuantity: row.endingQuantity || "",
          price: toNum(row.price),
          account: row.account || "Sales",
          taxName: row.taxName || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      writeAddons([...prepared, ...existing]);
      toast.success(`${prepared.length} addon(s) imported successfully.`);
      navigate("/products/addons");
    } catch (error) {
      console.error(error);
      toast.error("Failed to import addons.");
    }
  };

  return (
    <ThreePhaseImportWizard
      entityLabel="Addon"
      entityPluralLabel="Addons"
      fields={IMPORT_FIELDS}
      sampleHeaders={SAMPLE_HEADERS}
      sampleRows={SAMPLE_ROWS}
      sampleFileName="addons-import-sample.xls"
      onCancel={() => navigate("/products/addons")}
      onImport={handleImport}
    />
  );
}

