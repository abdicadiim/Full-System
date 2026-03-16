export type PaymentTerm = {
  label: string;
  value: string;
};

export const defaultPaymentTerms: PaymentTerm[] = [
  { label: "Due on Receipt", value: "Due on Receipt" },
  { label: "Net 15", value: "Net 15" },
  { label: "Net 30", value: "Net 30" },
  { label: "Net 45", value: "Net 45" },
  { label: "Net 60", value: "Net 60" },
];

import { useEffect, useMemo, useRef, useState } from "react";

type HookArgs = {
  initialValue?: string;
  onSelect?: (term: PaymentTerm) => void;
  terms?: PaymentTerm[];
};

export const usePaymentTermsDropdown = ({
  initialValue = "",
  onSelect,
  terms = defaultPaymentTerms,
}: HookArgs = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(initialValue);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedTerm(initialValue || "");
  }, [initialValue]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredTerms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return terms;
    return terms.filter((t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q));
  }, [searchQuery, terms]);

  const handleToggle = () => setIsOpen((v) => !v);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const handleSelect = (term: PaymentTerm) => {
    setSelectedTerm(term.value);
    setIsOpen(false);
    setSearchQuery("");
    onSelect?.(term);
  };

  return {
    dropdownRef,
    isOpen,
    searchQuery,
    setSearchQuery,
    selectedTerm,
    filteredTerms,
    handleToggle,
    handleSelect,
    open,
    close,
  };
};
