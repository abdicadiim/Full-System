import React, { useEffect, useState } from "react";
import { Info, Plus, Trash2, X } from "lucide-react";
import { defaultPaymentTerms, PaymentTerm } from "../hooks/usePaymentTermsDropdown";

type ConfigurePaymentTermsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (terms: PaymentTerm[]) => void;
  initialTerms?: PaymentTerm[];
};

const normalizeTerm = (term: PaymentTerm): PaymentTerm => ({
  label: term.label || "",
  value: term.value || "",
  days: term.days ?? "",
  discountDays: term.discountDays ?? "",
  discountPercentage: term.discountPercentage ?? "",
});

export const ConfigurePaymentTermsModal = ({
  isOpen,
  onClose,
  onSave,
  initialTerms = defaultPaymentTerms,
}: ConfigurePaymentTermsModalProps) => {
  const [terms, setTerms] = useState<PaymentTerm[]>(initialTerms.map(normalizeTerm));
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [defaultTermValue, setDefaultTermValue] = useState<string>("due-on-receipt");

  useEffect(() => {
    if (isOpen) {
      setTerms((initialTerms?.length ? initialTerms : defaultPaymentTerms).map(normalizeTerm));
      const sourceTerms = (initialTerms?.length ? initialTerms : defaultPaymentTerms) as any[];
      const savedDefault = sourceTerms.find((term: any) => Boolean(term?.isDefault))?.value;
      setDefaultTermValue(String(savedDefault || "due-on-receipt"));
      setHoveredRowIndex(null);
    }
  }, [initialTerms, isOpen]);

  if (!isOpen) return null;

  const updateTerm = (index: number, patch: Partial<PaymentTerm>) => {
    setTerms((prev) => prev.map((term, i) => (i === index ? { ...term, ...patch } : term)));
  };

  const addTerm = () => {
    const now = Date.now();
    setTerms((prev) => [
      ...prev,
      {
        label: "Custom",
        value: `custom-${now}`,
        days: "",
        discountDays: "",
        discountPercentage: "",
      },
    ]);
  };

  const removeTerm = (index: number) => {
    setTerms((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (!next.length) return prev;
      const removed = prev[index];
      if (removed?.value && removed.value === defaultTermValue) {
        setDefaultTermValue(next[0]?.value || "due-on-receipt");
      }
      return next;
    });
    setHoveredRowIndex(null);
  };

  const markAsDefault = (term: PaymentTerm) => {
    setDefaultTermValue(String(term?.value || ""));
  };

  const handleSave = () => {
    const cleaned = terms
      .map((term) => ({
        label: String(term.label || "").trim(),
        value: String(term.value || "").trim() || String(term.label || "").trim().toLowerCase().replace(/\s+/g, "-"),
        days: term.days === "" ? "" : term.days,
        discountDays: term.discountDays === "" ? "" : term.discountDays,
        discountPercentage: term.discountPercentage === "" ? "" : term.discountPercentage,
        isDefault:
          String(String(term.value || "").trim() || String(term.label || "").trim().toLowerCase().replace(/\s+/g, "-")) ===
          String(defaultTermValue || ""),
      }))
      .filter((term) => term.label);

    onSave(cleaned.length ? cleaned : defaultPaymentTerms);
    onClose();
  };

  const isNA = (value: unknown) => String(value ?? "").trim().toUpperCase() === "N/A";

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/45 p-4 pt-4">
      <div className="w-full max-w-[840px] overflow-hidden rounded-lg bg-white shadow-[0_20px_52px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-[#e3e6ef] px-5 py-4">
          <h3 className="text-[32px] font-medium text-gray-700">Configure Payment Terms</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#3f83f8] p-1 text-red-500 hover:bg-red-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-start gap-3" onMouseLeave={() => setHoveredRowIndex(null)}>
            <div className="w-full max-w-[585px] overflow-hidden rounded-md border border-[#d9dde8]">
              <table className="w-full border-collapse text-sm">
              <thead className="bg-[#f7f8fb] text-[12px] uppercase text-[#737987]">
                <tr>
                  <th className="border-b border-r border-[#d9dde8] px-3 py-3 text-left font-semibold">Term Name</th>
                  <th className="border-b border-r border-[#d9dde8] px-3 py-3 text-left font-semibold">Number of Days</th>
                  <th className="border-b border-[#d9dde8] px-3 py-2 text-left font-semibold" colSpan={2}>
                    <div className="flex items-center gap-1">
                      <span>Early Payment Discount</span>
                      <Info size={12} />
                    </div>
                  </th>
                </tr>
                <tr>
                  <th className="border-r border-[#d9dde8] px-3 py-2 text-left font-semibold" />
                  <th className="border-r border-[#d9dde8] px-3 py-2 text-left font-semibold" />
                  <th className="border-r border-[#d9dde8] px-3 py-2 text-left font-semibold">Days</th>
                  <th className="px-3 py-2 text-left font-semibold">Percentage</th>
                </tr>
              </thead>
                <tbody>
                  {terms.map((term, index) => {
                    const termValue = String(term?.value || "");
                    const isDefault = termValue === String(defaultTermValue || "");
                    return (
                      <tr
                        key={`${term.value}-${index}`}
                        className={`border-t border-[#d9dde8] ${hoveredRowIndex === index ? "bg-[#fbfcff]" : ""} ${isDefault ? "bg-[#f7fbff]" : ""}`}
                        onMouseEnter={() => setHoveredRowIndex(index)}
                      >
                    <td className="border-r border-[#d9dde8] px-0 py-0">
                      <input
                        value={term.label}
                        onChange={(event) => updateTerm(index, { label: event.target.value })}
                        className={`h-10 w-full px-3 text-sm outline-none ${isDefault ? "font-medium text-[#1f5fcc]" : "text-gray-700"}`}
                      />
                    </td>
                    <td className="border-r border-[#d9dde8] px-0 py-0">
                      {isNA(term.days) ? (
                        <div className="h-10 w-full px-3 text-right text-sm leading-10 text-gray-600">N/A</div>
                      ) : (
                        <input
                          value={String(term.days ?? "")}
                          onChange={(event) => updateTerm(index, { days: event.target.value })}
                          className="h-10 w-full px-3 text-right text-sm text-gray-700 outline-none"
                        />
                      )}
                    </td>
                    <td className="border-r border-[#d9dde8] px-0 py-0">
                      {isNA(term.discountDays) ? (
                        <div className="h-10 w-full px-3 text-right text-sm leading-10 text-gray-600">N/A</div>
                      ) : (
                        <input
                          value={String(term.discountDays ?? "")}
                          onChange={(event) => updateTerm(index, { discountDays: event.target.value })}
                          className="h-10 w-full px-3 text-right text-sm text-gray-700 outline-none"
                        />
                      )}
                    </td>
                    <td className="px-0 py-0">
                      {isNA(term.discountPercentage) ? (
                        <div className="h-10 w-full px-3 text-right text-sm leading-10 text-gray-600">N/A</div>
                      ) : (
                        <input
                          value={String(term.discountPercentage ?? "")}
                          onChange={(event) => updateTerm(index, { discountPercentage: event.target.value })}
                          className="h-10 w-full px-3 text-right text-sm text-gray-700 outline-none"
                        />
                      )}
                    </td>
                  </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="relative w-[170px] min-h-[340px]">
              {hoveredRowIndex !== null && terms[hoveredRowIndex] ? (
                <div
                  className="absolute left-0 flex items-center gap-3 text-sm"
                  style={{ top: `${86 + hoveredRowIndex * 40}px` }}
                >
                  <button
                    type="button"
                    onClick={() => markAsDefault(terms[hoveredRowIndex])}
                    className="text-[#2f6fed] hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
                    disabled={String(terms[hoveredRowIndex]?.value || "") === String(defaultTermValue || "")}
                  >
                    Mark as Default
                  </button>
                  {!isNA(terms[hoveredRowIndex]?.days) && !isNA(terms[hoveredRowIndex]?.discountDays) && !isNA(terms[hoveredRowIndex]?.discountPercentage) ? (
                    <button
                      type="button"
                      onClick={() => removeTerm(hoveredRowIndex)}
                      className="inline-flex items-center gap-1 text-[#eb4c5a] hover:underline"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={addTerm}
            className="mt-5 inline-flex items-center gap-2 text-sm text-[#2f6fed] hover:text-[#1f5bdb]"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2f6fed] text-white">
              <Plus size={12} />
            </span>
            <span>Add New</span>
          </button>
        </div>

        <div className="flex items-center gap-3 border-t border-[#e3e6ef] px-5 py-6">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-[#25b46b] px-5 py-2 text-sm font-medium text-white hover:bg-[#1f9c5d]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-[#f7f7f7] px-5 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurePaymentTermsModal;
