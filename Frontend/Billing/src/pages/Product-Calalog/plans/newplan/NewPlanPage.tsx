import React, { useEffect } from "react";
import NewPlanForm from "./NewPlanForm";

export default function NewPlanPage() {
  // Keep only sidebar + page content visible for this screen.
  useEffect(() => {
    const appHeader = document.querySelector("header") as HTMLElement | null;
    const appMain = document.querySelector("main") as HTMLElement | null;
    const previousHeaderDisplay = appHeader?.style.display ?? "";
    const previousMainPadding = appMain?.style.padding ?? "";
    if (appHeader) appHeader.style.display = "none";
    if (appMain) appMain.style.padding = "0";
    return () => {
      if (appHeader) appHeader.style.display = previousHeaderDisplay;
      if (appMain) appMain.style.padding = previousMainPadding;
    };
  }, []);

  return <NewPlanForm />;
}
