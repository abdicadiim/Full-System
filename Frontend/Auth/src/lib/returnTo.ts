export const getReturnTo = () => {
  const url = new URL(window.location.href);
  return url.searchParams.get("return") || "";
};

export const goReturnTo = (fallbackUrl: string) => {
  const returnTo = getReturnTo();
  window.location.href = returnTo || fallbackUrl;
};

