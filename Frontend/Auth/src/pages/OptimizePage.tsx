import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";
import SetupHeader from "../components/SetupHeader";
import { getAppDisplayName, getAuthApp } from "../lib/appBranding";
import { orgApi } from "../services/orgApi";

type BillingMode = "one_time" | "recurring" | "both";

export default function OptimizePage() {
  const appName = getAppDisplayName();
  const authApp = getAuthApp();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [mode, setMode] = useState<BillingMode>("recurring");
  const [invoiceTool, setInvoiceTool] = useState("");
  const showBillingModes = authApp !== "invoice";
  const showInvoiceTool = authApp === "invoice";

  const industryOptions = useMemo<SelectOption[]>(
    () =>
      [
        "Agency or Sales House",
        "Agriculture",
        "Art and Design",
        "Automotive",
        "Construction",
        "Consulting",
        "Consumer Packaged Goods",
        "Education",
        "Engineering",
        "Entertainment",
        "Financial Services",
        "Food Services (Restaurants/Fast Food)",
        "Gaming",
        "Government",
        "Health Care",
        "Interior Design",
        "Internal",
        "Legal",
        "Manufacturing",
        "Marketing",
        "Mining and Logistics",
        "Non-Profit",
        "Publishing and Web Media",
        "Real Estate",
        "Retail (E-Commerce and Offline)",
        "Services",
        "Technology",
        "Telecommunications",
        "Travel/Hospitality",
        "Web Designing",
        "Web Development",
        "Writers",
      ].map((label) => ({ value: label, label })),
    []
  );

  const invoiceToolOptions = useMemo<SelectOption[]>(
    () =>
      [
        "FreshBooks",
        "Invoice2Go",
        "Wave Invoicing",
        "Invoicera",
        "Hiveage",
        "Invoicely",
        "Harvest",
        "QBO",
        "Xero",
        "Tally",
        "Pen and paper",
        "Spreadsheets and Word documents",
        "Others",
        "I'm not using anything right now",
      ].map((label) => ({ value: label, label })),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateFromDatabase = async () => {
      const result = await orgApi.getMe().catch(() => null);
      if (!result?.success || !isMounted) return;

      const org = result.data || {};
      const storedIndustry = String(org?.industry || "").trim();
      const storedBillingProcess = String(org?.billingProcess || "").trim() as BillingMode;
      const storedInvoicingTool = String(org?.invoicingTool || "").trim();

      if (storedIndustry) setIndustry(storedIndustry);
      if (showBillingModes && ["one_time", "recurring", "both"].includes(storedBillingProcess)) {
        setMode(storedBillingProcess);
      }
      if (showInvoiceTool && storedInvoicingTool) {
        setInvoiceTool(storedInvoicingTool);
      }
    };

    void hydrateFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [showBillingModes, showInvoiceTool]);

  const onContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!industry) return;
    if (showInvoiceTool && !invoiceTool) return;

    setSaving(true);
    setSaveError(null);

    const patch: any = { industry };
    if (authApp === "invoice") patch.invoicingTool = invoiceTool;
    if (authApp !== "invoice") patch.billingProcess = mode;

    orgApi
      .patchMe(patch)
      .then((r) => {
        if (!r.success) {
          setSaving(false);
          setSaveError(r.message || "Failed to save organization profile");
          return;
        }
        setSaving(false);
        if (authApp === "invoice") {
          navigate(`/verifying${window.location.search}`);
          return;
        }
        navigate(`/moving-system${window.location.search}`);
      })
      .catch(() => {
        setSaving(false);
        setSaveError("Failed to save organization profile");
      });
  };

  return (
    <div className="min-h-screen w-full bg-white font-display text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="mb-6">
          <SetupHeader />
        </div>

        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-slate-200">
            <div className={["h-1 rounded-full bg-primary", authApp === "invoice" ? "w-full" : "w-2/3"].join(" ")} />
          </div>
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight">{`Optimize ${appName}`}</h1>
          <p className="mt-2 text-[11px] text-slate-600">{`We'll clear the clutter and hide features that you won't need.`}</p>
        </div>

        <form onSubmit={onContinue} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-red-600">
              Industry Type<span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              label={undefined}
              required
              value={industry}
              options={industryOptions}
              placeholder="Select or type to add"
              onChange={setIndustry}
              invalid={submitted && !industry}
            />
            {submitted && !industry ? (
              <p className="text-[11px] text-red-600">Industry type is required.</p>
            ) : (
              <p className="text-[11px] text-slate-500">{industry ? "Selected." : "Select an option to continue."}</p>
            )}
          </div>

          {showBillingModes ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-red-600">
                Which of these best describes your billing process?<span className="text-red-500">*</span>
              </label>

              <ModeCard
                active={mode === "one_time"}
                title="One-time billing"
                desc="Generate one-time invoices."
                onClick={() => setMode("one_time")}
              />
              <ModeCard
                active={mode === "recurring"}
                title="Recurring billing"
                desc="Create subscriptions, add-ons, plans, and coupons. Automate invoices and refunds."
                onClick={() => setMode("recurring")}
              />
              <ModeCard
                active={mode === "both"}
                title="One-time & recurring billing"
                desc="Create both one-time invoices and subscriptions, as required."
                onClick={() => setMode("both")}
              />

              <p className="text-[11px] text-slate-500">Note: This can be changed later from Settings.</p>
            </div>
          ) : null}

          {showInvoiceTool ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <span>
                  How are you managing invoicing currently?<span className="text-red-500">*</span>
                </span>
                <span className="material-symbols-outlined text-sm text-slate-400" title="This helps us customize setup">
                  info
                </span>
              </label>

              <SearchableSelect
                label={undefined}
                required
                value={invoiceTool}
                options={invoiceToolOptions}
                placeholder="Select"
                onChange={setInvoiceTool}
                invalid={submitted && !invoiceTool}
              />

              {submitted && !invoiceTool ? <p className="text-[11px] text-red-600">This field is required.</p> : null}
            </div>
          ) : null}

          <div className="pt-2">
            {saveError ? <p className="mb-3 text-[11px] text-red-600">{saveError}</p> : null}
            <button
              className="w-full rounded-lg bg-primary py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-colors hover:bg-primary/90"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border bg-white p-4 text-left transition-colors",
        active ? "border-primary ring-1 ring-primary/30" : "border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-base text-primary">{active ? "check_circle" : "radio_button_unchecked"}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-[11px] text-slate-600">{desc}</div>
        </div>
      </div>
    </button>
  );
}
