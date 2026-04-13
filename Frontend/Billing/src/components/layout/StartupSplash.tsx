import React from "react";

const billingLogoSrc = new URL("../../assets/BillingLogo.png", import.meta.url).href;

type StartupSplashProps = {
  title?: string;
  message?: string;
  blocking?: boolean;
};

export default function StartupSplash({
  title = "Getting your workspace ready",
  message = "Please wait while we make everything perfect for you...",
  blocking = true,
}: StartupSplashProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-6 ${
        blocking ? "bg-white" : "pointer-events-none bg-white/72 backdrop-blur-[2px]"
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-[#156372] border-r-[#156372]/35"
            aria-hidden="true"
          />
          <div
            className="absolute inset-[14px] rounded-full border border-[#156372]/10"
            aria-hidden="true"
          />
          <img
            src={billingLogoSrc}
            alt="Billing loading logo"
            className="relative z-10 h-32 w-32 object-contain select-none"
            loading="eager"
            draggable={false}
          />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[#0f4450]">{title}</h1>
        <p className="mt-2 max-w-md text-[12px] font-medium text-[#156372]">{message}</p>
      </div>
    </div>
  );
}
