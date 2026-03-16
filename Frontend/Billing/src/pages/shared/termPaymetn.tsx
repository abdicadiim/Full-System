import React from "react";
import PaymentTermsDropdown from "../../components/PaymentTermsDropdown";
import { defaultPaymentTerms, PaymentTerm } from "../../hooks/usePaymentTermsDropdown";

export const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const parseDisplayDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(raw.replace(/(\d{2}) ([A-Za-z]{3}) (\d{4})/, "$1 $2, $3"));
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const computeDueDateFromTerm = (baseDateValue: any, termValue: string, termsList: PaymentTerm[]) => {
  const baseDate = parseDisplayDate(baseDateValue);
  const selectedTerm = termsList.find((term) => term.value === termValue) || termsList[0];
  if (!selectedTerm) return formatDisplayDate(baseDate);
  const label = String(selectedTerm.label || "").toLowerCase();
  const termDays = Number(selectedTerm.days);
  let dueDate = new Date(baseDate);

  if (label.includes("due end of next month")) {
    dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
  } else if (label.includes("due end of the month")) {
    dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  } else if (label.includes("due on receipt")) {
    dueDate = new Date(baseDate);
  } else if (!Number.isNaN(termDays) && termDays >= 0) {
    dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + termDays);
  }

  return formatDisplayDate(dueDate);
};

type TermPaymetnProps = {
  value: string;
  transactionDate: string;
  terms?: PaymentTerm[];
  onApply: (payload: {
    term: string;
    dueDate: string;
    discountDays: string;
    discountPercentage: number;
  }) => void;
};

const TermPaymetn: React.FC<TermPaymetnProps> = ({
  value,
  transactionDate,
  terms = defaultPaymentTerms,
  onApply,
}) => {
  const applyPaymentTerm = (termValue: string) => {
    const dueDate = computeDueDateFromTerm(transactionDate, termValue, terms);
    const term = terms.find((row) => row.value === termValue);
    onApply({
      term: termValue,
      dueDate,
      discountDays: String(term?.discountDays ?? ""),
      discountPercentage: Number(term?.discountPercentage ?? 0),
    });
  };

  return (
    <PaymentTermsDropdown
      value={value}
      onChange={(nextValue) => applyPaymentTerm(nextValue)}
      customTerms={terms}
    />
  );
};

export default TermPaymetn;
