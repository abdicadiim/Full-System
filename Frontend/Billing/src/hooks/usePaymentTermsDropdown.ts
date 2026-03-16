import { useEffect, useMemo, useRef, useState } from "react";

export type PaymentTerm = {
  label: string;
  value: string;
  days?: number | string;
  discountDays?: number | string;
  discountPercentage?: number | string;
};

export const defaultPaymentTerms: PaymentTerm[] = [
  { label: "Due end of next month", value: "due-end-of-next-month", days: "N/A", discountDays: "N/A", discountPercentage: "N/A" },
  { label: "Due end of the month", value: "due-end-of-the-month", days: "N/A", discountDays: "N/A", discountPercentage: "N/A" },
  { label: "Due on Receipt", value: "due-on-receipt", days: 0, discountDays: "", discountPercentage: 0 },
  { label: "Net 15", value: "net-15", days: 15, discountDays: "", discountPercentage: 0 },
  { label: "Net 30", value: "net-30", days: 30, discountDays: "", discountPercentage: 0 },
  { label: "Net 45", value: "net-45", days: 45, discountDays: "", discountPercentage: 0 },
  { label: "Net 60", value: "net-60", days: 60, discountDays: "", discountPercentage: 0 },
  { label: "Custom", value: "custom", days: "", discountDays: "", discountPercentage: "" },
];

type UsePaymentTermsDropdownOptions = {
  initialValue?: string;
  onSelect?: (term: PaymentTerm) => void;
  terms?: PaymentTerm[];
};

export const usePaymentTermsDropdown = ({
  initialValue = "",
  onSelect,
  terms = defaultPaymentTerms,
}: UsePaymentTermsDropdownOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(initialValue);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedTerm(initialValue || "");
  }, [initialValue]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", onDocClick);
    }
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  const filteredTerms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return terms;
    return terms.filter(
      (term) =>
        term.label.toLowerCase().includes(query) || term.value.toLowerCase().includes(query)
    );
  }, [searchQuery, terms]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleSelect = (term: PaymentTerm) => {
    setSelectedTerm(term.value);
    setIsOpen(false);
    onSelect?.(term);
  };

  return {
    dropdownRef,
    isOpen,
    handleToggle,
    selectedTerm,
    searchQuery,
    setSearchQuery,
    filteredTerms,
    handleSelect,
  };
};

export default usePaymentTermsDropdown;
