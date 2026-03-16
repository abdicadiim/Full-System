import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Settings } from "lucide-react";
import { defaultPaymentTerms, PaymentTerm } from "../hooks/usePaymentTermsDropdown";

type PaymentTermsDropdownProps = {
  value?: string;
  onChange: (value: string) => void;
  onConfigureTerms?: () => void;
  customTerms?: PaymentTerm[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
};

export const PaymentTermsDropdown = ({
  value = "",
  onChange,
  onConfigureTerms,
  customTerms = defaultPaymentTerms,
  placeholder = "Select payment terms",
  className = "",
  menuClassName = "",
}: PaymentTermsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTermValue, setActiveTermValue] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const terms = customTerms.length ? customTerms : defaultPaymentTerms;
  const selected = terms.find((term) => term.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const filteredTerms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return terms;
    return terms.filter((term) =>
      [term.label, term.value, String(term.days ?? "")]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, terms]);

  const handleSelect = (term: PaymentTerm) => {
    onChange(term.value);
    setIsOpen(false);
    setSearchQuery("");
    setActiveTermValue("");
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#3f83f8] bg-white px-3 text-sm text-gray-700 shadow-[0_0_0_1px_rgba(63,131,248,0.05)] outline-none"
      >
        <span className="truncate text-left">{selected?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-2 shrink-0 text-[#3f83f8] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full z-50 mt-2 w-full min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ${menuClassName}`}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-[#3f83f8] px-3 py-2">
              <Search size={15} className="text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                className="w-full border-0 p-0 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredTerms.length > 0 ? (
              filteredTerms.map((term) => {
                const isSelected = term.value === value;
                const isActive = activeTermValue === term.value;
                return (
                  <button
                    key={term.value}
                    type="button"
                    onClick={() => handleSelect(term)}
                    onMouseEnter={() => setActiveTermValue(term.value)}
                    onFocus={() => setActiveTermValue(term.value)}
                    onMouseLeave={() => setActiveTermValue("")}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-[#4a8df0] font-medium text-white"
                        : isActive
                          ? "border border-[#2b2b2b] bg-white text-gray-700"
                          : "border border-transparent text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{term.label}</span>
                    {isSelected && <Check size={16} className="shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-gray-500">No payment terms found</div>
            )}
          </div>

          {onConfigureTerms && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                  onConfigureTerms();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#4a61ff] hover:bg-gray-50"
              >
                <Settings size={15} />
                <span>Configure Terms</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentTermsDropdown;
