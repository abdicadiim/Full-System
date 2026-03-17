import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";
import SetupHeader from "../components/SetupHeader";
import { useNavigate } from "react-router-dom";
import { orgApi } from "../services/orgApi";

type ImportChoice = "yes" | "no";

export default function MovingSystemPage() {
  const navigate = useNavigate();
  const [howBill, setHowBill] = useState("");
  const [importChoice, setImportChoice] = useState<ImportChoice>("yes");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const billOptions = useMemo<SelectOption[]>(
    () =>
      [
        "Spreadsheets (Excel/Google Sheets)",
        "Manual invoices",
        "POS / cash register",
        "Accounting software",
        "Another billing software",
        "Not billing yet",
      ].map((label) => ({ value: label, label })),
    []
  );

  const onStart = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!howBill) return;
    setSaving(true);
    setSaveError(null);
    orgApi
      .patchMe({ currentBillingTool: howBill, wantsImport: importChoice === "yes" })
      .then((r) => {
        if (!r.success) {
          setSaving(false);
          setSaveError(r.message || "Failed to save organization profile");
          return;
        }
        setSaving(false);
        navigate(`/verifying${window.location.search}`);
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
          <div className="flex gap-1">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className="h-1 flex-1 rounded-full bg-primary" />
          </div>
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight">{`Moving from a different system?`}</h1>
          <p className="mt-2 text-[11px] text-slate-600">
            You don&apos;t have to start from scratch! Import existing data for a smooth transition.
          </p>
        </div>

        <form onSubmit={onStart} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              How do you currently bill your customers?<span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              label={undefined}
              required
              value={howBill}
              options={billOptions}
              placeholder="Select"
              onChange={setHowBill}
              invalid={submitted && !howBill}
            />
            {submitted && !howBill ? <p className="text-[11px] text-red-600">This field is required.</p> : null}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700">
              Do you want to import existing data, such as customers and transactions?<span className="text-red-500">*</span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <ChoiceCard
                active={importChoice === "yes"}
                title="Yes"
                onClick={() => setImportChoice("yes")}
              />
              <ChoiceCard
                active={importChoice === "no"}
                title="No"
                onClick={() => setImportChoice("no")}
              />
            </div>

            <p className="text-[11px] text-slate-600">
              {importChoice === "yes"
                ? "Great, we'll prompt you to import your data later."
                : "Got it, you can start creating records and transactions right away! You will still be able to import data later."}
            </p>
          </div>

          <div className="pt-2">
            {saveError ? <p className="mb-3 text-[11px] text-red-600">{saveError}</p> : null}
            <button
              className="w-full rounded-lg bg-primary py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-colors hover:bg-primary/90"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Let's Get Started"}
            </button>
            <div className="mt-4 text-center text-[11px]">
              <Link className="text-slate-600 hover:underline" to={`/optimize${window.location.search}`}>
                Back
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChoiceCard({ active, title, onClick }: { active: boolean; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-lg border bg-white p-4 text-left transition-colors",
        active ? "border-primary ring-1 ring-primary/30" : "border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-base text-primary">{active ? "radio_button_checked" : "radio_button_unchecked"}</span>
      <span className="text-sm font-semibold text-slate-900">{title}</span>
    </button>
  );
}
