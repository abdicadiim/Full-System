import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { countryPhoneCodes } from "./countriesData";

type Props = {
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  buttonWidthClassName?: string;
  menuWidthClassName?: string;
};

export default function PhonePrefixDropdown({
  value,
  isOpen,
  onToggle,
  onClose,
  onChange,
  buttonWidthClassName = "w-[88px]",
  menuWidthClassName = "w-[220px]",
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [searchQuery, setSearchQuery] = useState("");

  const updateMenuPosition = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleOutsideClick = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener("pointerdown", handleOutsideClick, true);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (isOpen) updateMenuPosition();
  }, [isOpen, value]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredPhoneCodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return countryPhoneCodes;
    return countryPhoneCodes.filter((cp) => {
      return cp.code.toLowerCase().includes(query) || cp.name.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`${buttonWidthClassName} px-2 py-1.5 border-r border-gray-300 text-[13px] bg-gray-50 text-gray-600 focus:outline-none flex items-center justify-between`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{value || "+252"}</span>
        <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={`overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg ${menuWidthClassName}`}
            style={menuStyle}
          >
            <div className="border-b border-gray-200 bg-white p-2">
              <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
                <Search size={14} className="flex-shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[148px] overflow-y-auto custom-scrollbar py-1">
              {filteredPhoneCodes.map((cp, index) => {
                const isSelected = value === cp.code;
                return (
                  <button
                    key={`${cp.code}-${cp.name}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChange(cp.code);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-1.5 text-[13px] transition-colors hover:bg-gray-100 ${
                      isSelected ? "bg-blue-50 font-medium text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <span className="w-12 flex-shrink-0">{cp.code}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{cp.name}</span>
                    {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
