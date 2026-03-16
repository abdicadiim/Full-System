import React from "react";
import Card from "../../../components/ui/Card";
import { LayoutDashboard } from "lucide-react";

export default function ProjectsPage() {
  return (
    <Card className="p-10">
      <h3 className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-slate-800">
        <LayoutDashboard size={18} className="text-slate-700" />
        Projects
      </h3>
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-center text-[14px] text-slate-500">
        Add Project(s) to this watchlist
      </div>
    </Card>
  );
}
