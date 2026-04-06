import React from "react";

export default function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["animate-pulse rounded-md bg-slate-200/80", className].filter(Boolean).join(" ")}
    />
  );
}

