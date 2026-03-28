export const getReturnTo = () => {
  const url = new URL(window.location.href);
  return url.searchParams.get("return") || "";
};

export const goReturnTo = (fallbackUrl: string) => {
  const returnTo = getReturnTo();
  const target = returnTo || fallbackUrl;
  const url = (() => {
    try {
      return new URL(target);
    } catch {
      return new URL(target, window.location.href);
    }
  })();

  if (new URL(window.location.href).searchParams.get("logout") === "1") {
    url.searchParams.set("auth_return", "1");
  }

  window.location.replace(url.toString());
};

