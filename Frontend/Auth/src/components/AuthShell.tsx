import React from "react";
import { getHeroIcon, getHeroTitle } from "../lib/appBranding";

type AuthShellProps = {
  children: React.ReactNode;
  variant?: "default" | "split";
  sidePanel?: React.ReactNode;
  contentClassName?: string;
  panelSide?: "left" | "right";
};

export default function AuthShell({
  children,
  variant = "default",
  sidePanel,
  contentClassName = "",
  panelSide = "right",
}: AuthShellProps) {
  const heroTitle = getHeroTitle();
  const heroIcon = getHeroIcon();
  const panelOnLeft = panelSide === "left";

  if (variant === "split") {
    const splitGridClass = panelOnLeft
      ? "lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]"
      : "lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]";
    const splitContentOrderClass = panelOnLeft ? "lg:order-2" : "lg:order-1";
    const splitPanelOrderClass = panelOnLeft ? "lg:order-1 auth-panel-enter-left" : "lg:order-2 auth-panel-enter-right";
    const splitPanelRadiusClass = panelOnLeft
      ? "lg:rounded-tl-[32px] lg:rounded-bl-[32px] lg:rounded-tr-[180px] lg:rounded-br-[180px]"
      : "lg:rounded-tl-[180px] lg:rounded-bl-[180px] lg:rounded-tr-[32px] lg:rounded-br-[32px]";

    return (
      <div className="min-h-screen w-full bg-[linear-gradient(135deg,#e8f2f3_0%,#f6f8f8_45%,#ecf6f6_100%)] font-display text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
          <div
            className="auth-shell-enter w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_70px_rgba(18,86,99,0.16)] backdrop-blur"
            style={{ viewTransitionName: "auth-card" }}
          >
            <div className={["flex flex-col lg:grid", splitGridClass].join(" ")}>
              <div
                className={[
                  "auth-content-enter flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14",
                  splitContentOrderClass,
                  contentClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="w-full max-w-lg">{children}</div>
              </div>

              <div
                className={[
                  "relative flex h-full overflow-hidden rounded-t-[28px] bg-primary px-8 py-10 text-white sm:px-10 lg:rounded-t-none lg:px-14 lg:py-14",
                  splitPanelRadiusClass,
                  splitPanelOrderClass,
                ].join(" ")}
              >
                <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.06)_42%,rgba(6,29,34,0.12)_100%)]" />
                <div className="absolute -right-16 top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-20 left-6 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10 flex h-full min-h-[320px] w-full items-center justify-center">
                  {sidePanel ?? (
                    <div className="max-w-sm text-center">
                      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{heroTitle}</h2>
                      <p className="mt-4 text-base leading-7 text-white/80">
                        Secure access to your workspace with the tools you need to keep work moving.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
