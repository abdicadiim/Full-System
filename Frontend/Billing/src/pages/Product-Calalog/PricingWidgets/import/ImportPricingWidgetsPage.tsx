import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ThreePhaseImportWizard, { ImportFieldDef, ImportMappedRecord } from "../../shared/ThreePhaseImportWizard";
import { readPricingWidgets, writePricingWidgets } from "../storage";

const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "name", label: "Widget Name", required: true, aliases: ["widget name", "name"] },
  { key: "product", label: "Product", required: true, aliases: ["product", "product name"] },
  { key: "template", label: "Template", aliases: ["template"] },
  { key: "status", label: "Status", aliases: ["status"] },
  { key: "selectedPlans", label: "Selected Plans", aliases: ["selected plans", "plans"] },
  { key: "caption", label: "Caption", aliases: ["caption"] },
  { key: "buttonLabel", label: "Button Label", aliases: ["button label"] },
  { key: "buttonColor", label: "Button Color", aliases: ["button color"] },
];

const SAMPLE_HEADERS = ["Widget Name", "Product", "Template", "Status", "Selected Plans", "Caption", "Button Label", "Button Color"];
const SAMPLE_ROWS = [
  ["Cloud Box Monthly", "Cloud Box", "Classic", "Active", "BASIC|STANDARD|PROFESSIONAL", "Best value plans", "Subscribe", "#1b5e6a"],
  ["Cloud Box Annual", "Cloud Box", "Cards", "Inactive", "ENTERPRISE|ULTIMATE", "Save more with annual billing", "Choose Plan", "#1b5e6a"],
];

export default function ImportPricingWidgetsPage() {
  const navigate = useNavigate();

  const handleImport = (rows: ImportMappedRecord[]) => {
    try {
      const existing = readPricingWidgets();
      const prepared = rows.map((row) => ({
        id: `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: row.name || "",
        product: row.product || "",
        template: row.template || "Classic",
        status: String(row.status || "").toLowerCase() === "inactive" ? "Inactive" : "Active",
        selectedPlans: row.selectedPlans || "",
        caption: row.caption || "",
        buttonLabel: row.buttonLabel || "Subscribe",
        buttonColor: row.buttonColor || "#1b5e6a",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      writePricingWidgets([...prepared, ...existing]);
      toast.success(`${prepared.length} pricing widget(s) imported successfully.`);
      navigate("/products/pricing-widgets");
    } catch (error) {
      console.error(error);
      toast.error("Failed to import pricing widgets.");
    }
  };

  return (
    <ThreePhaseImportWizard
      entityLabel="Pricing Widget"
      entityPluralLabel="Pricing Widgets"
      fields={IMPORT_FIELDS}
      sampleHeaders={SAMPLE_HEADERS}
      sampleRows={SAMPLE_ROWS}
      sampleFileName="pricing-widgets-import-sample.xls"
      onCancel={() => navigate("/products/pricing-widgets")}
      onImport={handleImport}
    />
  );
}

