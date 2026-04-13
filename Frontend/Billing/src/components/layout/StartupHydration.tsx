import React from "react";
import { useStartupHydration } from "../../hooks/useStartupHydration";
import StartupSplash from "./StartupSplash";

type StartupHydrationProps = {
  children: React.ReactNode;
};

export default function StartupHydration({ children }: StartupHydrationProps) {
  const { hydrating, hasCachedData, error } = useStartupHydration();
  const isItemsRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/products/items");
  const showSplash = Boolean(error) || (hydrating && !hasCachedData && !isItemsRoute);

  return (
    <>
      {children}
      {showSplash && (
        <StartupSplash
          blocking={false}
          title={error ? "Loading took longer than expected" : "Getting your workspace ready"}
          message={error || "Please wait while we make everything perfect for you..."}
        />
      )}
    </>
  );
}
