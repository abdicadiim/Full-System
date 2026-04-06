let cleanupTimer: number | null = null;

export const prepareAuthViewTransition = (direction: "forward" | "backward") => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove("auth-nav-forward", "auth-nav-backward");
  root.classList.add(direction === "forward" ? "auth-nav-forward" : "auth-nav-backward");

  if (cleanupTimer) {
    window.clearTimeout(cleanupTimer);
  }

  cleanupTimer = window.setTimeout(() => {
    root.classList.remove("auth-nav-forward", "auth-nav-backward");
    cleanupTimer = null;
  }, 700);
};
