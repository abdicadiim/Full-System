import React from "react";

const invoiceLogoSrc = new URL("../../assets/Invoicelogo.png", import.meta.url).href;

export default function StartupSplash() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white px-6">
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
            src={invoiceLogoSrc}
            alt="Invoice loading logo"
            className="relative z-10 h-32 w-32 object-contain select-none"
            loading="eager"
            draggable={false}
          />
        </div>
        <p className="mt-3 max-w-md text-[12px] font-medium text-[#156372]">
          Please wait while we make everything perfect for you...
        </p>
      </div>
    </div>
  );
}
