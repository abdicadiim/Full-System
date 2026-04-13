import React from "react";
import { useStartupHydration } from "../../hooks/useStartupHydration";
import StartupSplash from "./StartupSplash";

type StartupHydrationProps = {
  children: React.ReactNode;
};

export default function StartupHydration({ children }: StartupHydrationProps) {
  const { hydrating, error } = useStartupHydration();

  return (
    <>
      {children}
      {(hydrating || error) && (
        <StartupSplash
          blocking
          title={error ? "Loading took longer than expected" : "Getting your workspace ready"}
          message={error || "Please wait while we make everything perfect for you..."}
        />
      )}
    </>
  );
}
