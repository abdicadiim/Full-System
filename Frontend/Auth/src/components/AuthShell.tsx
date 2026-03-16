import React from "react";
import { getHeroIcon, getHeroTitle } from "../lib/appBranding";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const heroTitle = getHeroTitle();
  const heroIcon = getHeroIcon();

  return (
    <div className="min-h-screen w-full bg-background-light font-display text-slate-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-10 lg:px-10">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-col lg:flex-row">
            <div className="relative hidden w-1/2 overflow-hidden bg-gradient-mesh p-16 lg:flex lg:flex-col lg:justify-between">
              <div className="relative z-10">
                <div className="mb-16 flex items-center gap-3">
                  <div className="rounded-lg bg-white/10 p-2 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl text-white">{heroIcon}</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">BillForward</h2>
                </div>

                <div className="max-w-md">
                  <h1 className="mb-8 text-5xl font-black leading-tight text-white">{heroTitle}</h1>
                  <div className="space-y-8">
                    <Feature
                      icon="speed"
                      title="Efficiency"
                      text="Automate complex billing cycles and reduce manual overhead by 80%."
                    />
                    <Feature
                      icon="verified_user"
                      title="Security"
                      text="Enterprise-grade encryption and compliance with global financial standards."
                    />
                    <Feature
                      icon="trending_up"
                      title="Growth"
                      text="Seamlessly scale your revenue operations as your business expands globally."
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <div />
              </div>

              <div className="absolute right-[-10%] top-[-10%] h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-[-5%] left-[-5%] h-64 w-64 rounded-full bg-slate-900/40 blur-2xl" />
            </div>

            <div className="flex w-full items-center justify-center p-8 lg:w-1/2 lg:p-16">
              <div className="w-full max-w-md">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        <span className="material-symbols-outlined text-white">{icon}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/70">{text}</p>
      </div>
    </div>
  );
}
