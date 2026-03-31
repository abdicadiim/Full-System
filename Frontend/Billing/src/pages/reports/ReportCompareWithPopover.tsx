import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

type CompareMode = "None" | "Previous Year(s)" | "Previous Period(s)";

type ReportCompareWithPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  value: CompareMode;
  count: string;
  latestToOldest: boolean;
  onClose: () => void;
  onApply: (next: { compareWith: CompareMode; compareCount: string; compareLatestToOldest: boolean }) => void;
};

const COMPARE_OPTIONS: CompareMode[] = ["None", "Previous Year(s)", "Previous Period(s)"];
const COUNT_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const isBrowser = typeof document !== "undefined";

export default function ReportCompareWithPopover({
  open,
  anchorRef,
  value,
  count,
  latestToOldest,
  onClose,
  onApply,
}: ReportCompareWithPopoverProps) {
  const [compareWith, setCompareWith] = useState<CompareMode>(value);
  const [compareWithSearch, setCompareWithSearch] = useState("");
  const [compareCount, setCompareCount] = useState(count);
  const [isCompareWithOpen, setIsCompareWithOpen] = useState(true);
  const [compareCountOpen, setCompareCountOpen] = useState(false);
  const [arrangeLatestToOldest, setArrangeLatestToOldest] = useState(latestToOldest);
  const [panelPos, setPanelPos] = useState({ top: 110, left: 12 });
  const panelRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCompareWith(value);
    setCompareWithSearch("");
    setCompareCount(count || "1");
    setIsCompareWithOpen(true);
    setCompareCountOpen(false);
    setArrangeLatestToOldest(latestToOldest);
  }, [open, value, count, latestToOldest]);

  useLayoutEffect(() => {
    if (!open || !isBrowser) {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 320;
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const top = Math.max(12, rect.bottom + 8);
      setPanelPos({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open || !isBrowser) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const filteredCompareOptions = useMemo(() => {
    const q = compareWithSearch.trim().toLowerCase();
    if (!q) return COMPARE_OPTIONS;
    return COMPARE_OPTIONS.filter((option) => option.toLowerCase().includes(q));
  }, [compareWithSearch]);

  if (!open || !isBrowser) {
    return null;
  }

  const showCountFields = compareWith === "Previous Year(s)" || compareWith === "Previous Period(s)";

  const handleApply = () => {
    onApply({
      compareWith,
      compareCount: showCountFields ? compareCount : "1",
      compareLatestToOldest: showCountFields ? arrangeLatestToOldest : false,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-transparent" role="presentation">
      <div
        ref={panelRef}
        className="absolute w-[320px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
        style={{ top: `${panelPos.top}px`, left: `${panelPos.left}px` }}
        role="dialog"
        aria-modal="true"
        aria-label="Compare With"
      >
        <div className="border-b border-[#e5e7eb] px-3 py-2">
          <h3 className="text-[15px] font-medium text-[#111827]">Compare With</h3>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-3 py-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsCompareWithOpen((current) => !current);
                setCompareCountOpen(false);
              }}
              className="flex h-10 w-full items-center justify-between rounded-[6px] border border-[#d1d5db] bg-white px-3 text-left text-[14px] text-[#111827] outline-none transition hover:border-[#93c5fd]"
            >
              <span className={compareWith === "None" ? "text-[#94a3b8]" : "text-[#111827]"}>{compareWith}</span>
              <ChevronDown size={16} className={`text-[#94a3b8] transition-transform ${isCompareWithOpen ? "rotate-180" : ""}`} />
            </button>

            {isCompareWithOpen ? (
              <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                <div className="border-b border-[#e5e7eb] p-2">
                  <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                    <Search size={14} className="shrink-0 text-[#94a3b8]" />
                    <input
                      value={compareWithSearch}
                      onChange={(event) => setCompareWithSearch(event.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                </div>

                <div className="max-h-[150px] overflow-y-auto py-1">
                  {filteredCompareOptions.map((option) => {
                    const active = compareWith === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCompareWith(option);
                          setCompareWithSearch("");
                          setIsCompareWithOpen(false);
                          setCompareCountOpen(false);
                          if (option === "None") {
                            setArrangeLatestToOldest(false);
                          }
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                          active ? "bg-[#156372] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                        }`}
                      >
                        <span>{option}</span>
                        {active ? <Check size={14} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {showCountFields ? (
            <div className="mt-4 space-y-3">
              <div className="relative" ref={countRef}>
                <label className="mb-2 block text-[14px] text-[#111827]">
                  Number of {compareWith === "Previous Year(s)" ? "Year(s)" : "Period(s)"}
                </label>
                <button
                  type="button"
                  onClick={() => setCompareCountOpen((current) => !current)}
                  className="flex h-10 w-full items-center justify-between rounded-[6px] border border-[#d1d5db] bg-white px-3 text-left text-[14px] text-[#111827] outline-none transition hover:border-[#93c5fd]"
                >
                  <span>{compareCount}</span>
                  <ChevronDown size={16} className={`text-[#94a3b8] transition-transform ${compareCountOpen ? "rotate-180" : ""}`} />
                </button>

                {compareCountOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                    <div className="max-h-[180px] overflow-y-auto py-1">
                      {COUNT_OPTIONS.map((option) => {
                        const active = compareCount === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setCompareCount(option);
                              setCompareCountOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                              active ? "bg-[#156372] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                            }`}
                          >
                            <span>{option}</span>
                            {active ? <Check size={14} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="flex items-center gap-2 text-sm text-[#111827]">
                <input
                  type="checkbox"
                  checked={arrangeLatestToOldest}
                  onChange={(event) => setArrangeLatestToOldest(event.target.checked)}
                  className="h-4 w-4 rounded border-[#cbd5e1] accent-[#156372]"
                />
                <span>Arrange period/year from latest to oldest</span>
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-t border-[#e5e7eb] px-3 py-3">
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex h-8 items-center rounded bg-[#156372] px-3 text-[13px] font-medium text-white hover:bg-[#0f4f5b]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
