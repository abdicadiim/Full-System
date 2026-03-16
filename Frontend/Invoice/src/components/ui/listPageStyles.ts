export const LIST_PAGE = {
  tableWrapper: "flex-1 overflow-x-auto bg-white min-h-0",
  table: "w-full text-left border-collapse",
  thead: "bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]",
  headRow: "text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider",
  th: "px-4 py-3",
  row: "text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]",
  td: "px-4 py-3 text-gray-700",
  tdStickyRight:
    "px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm border-l border-[#eef1f6] group-hover:bg-[#f8fafc] transition-colors",
} as const;

export const LIST_BUTTONS = {
  iconButton: "p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors",
  primaryButton:
    "inline-flex items-center gap-1 text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm",
  primaryButtonSplitLeft:
    "inline-flex h-9 items-center gap-1.5 rounded-l-lg text-white px-3 sm:px-4 border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm",
  primaryButtonSplitRight:
    "inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-white border-[#0D4A52] border-b-[4px] border-l border-l-white/20 hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm",
} as const;

export const LIST_COLORS = {
  brandLink: "#1b5e6a",
  primaryGradient: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)",
} as const;

