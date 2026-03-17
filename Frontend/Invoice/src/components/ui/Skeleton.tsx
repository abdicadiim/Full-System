import React from "react";

export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={["animate-pulse rounded-md bg-slate-200/80", className].filter(Boolean).join(" ")} />;
}

