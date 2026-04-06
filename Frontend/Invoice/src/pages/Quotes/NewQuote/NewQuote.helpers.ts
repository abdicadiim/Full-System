export const resolveDefaultTaxIdFromTaxes = (rows: any[]): string => {
  const taxes = Array.isArray(rows) ? rows : [];
  if (taxes.length === 0) return "";

  const pickId = (tax: any) => String(tax?.id || tax?._id || "").trim();

  const byFlag = taxes.find((t: any) =>
    Boolean(t?.isDefault || t?.default || t?.is_default || t?.isDefaultTax || t?.defaultTax)
  );
  if (byFlag) return pickId(byFlag);

  const byName = taxes.find((t: any) => /default|standard/i.test(String(t?.name || t?.taxName || "")));
  if (byName) return pickId(byName);

  const byPositiveRate = taxes.find((t: any) => Number(t?.rate) > 0);
  if (byPositiveRate) return pickId(byPositiveRate);

  return pickId(taxes[0]);
};

export const toNumberSafe = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveSubtotalFromQuoteLike = (quoteLike: any, fallbackItems: any[] = []) => {
  const explicitSubtotal = toNumberSafe(quoteLike?.subTotal ?? quoteLike?.subtotal);
  if (explicitSubtotal > 0) return explicitSubtotal;

  const computedFromItems = (Array.isArray(fallbackItems) ? fallbackItems : []).reduce((sum, item) => {
    const quantity = toNumberSafe(item?.quantity);
    const rate = toNumberSafe(item?.rate ?? item?.unitPrice ?? item?.price);
    return sum + quantity * rate;
  }, 0);
  return computedFromItems;
};

export const normalizeDiscountForForm = (quoteLike: any, subTotalValue: number, taxValue: number) => {
  const discountTypeRaw = String(quoteLike?.discountType || "percent").toLowerCase();
  const discountTypeValue = discountTypeRaw === "amount" ? "amount" : "percent";
  const rawDiscount = toNumberSafe(quoteLike?.discount);

  if (discountTypeValue === "amount" || rawDiscount <= 0 || subTotalValue <= 0) {
    return { discountValue: rawDiscount, discountTypeValue };
  }

  const taxModeRaw = String(quoteLike?.taxExclusive || "Tax Exclusive").toLowerCase();
  const isInclusive = taxModeRaw.includes("inclusive");
  const shipping = toNumberSafe(quoteLike?.shippingCharges);
  const adjustment = toNumberSafe(quoteLike?.adjustment);
  const roundOff = toNumberSafe(quoteLike?.roundOff);
  const totalValue = toNumberSafe(quoteLike?.total ?? quoteLike?.amount);

  const totalAssumingPercent =
    subTotalValue + (isInclusive ? 0 : taxValue) - (subTotalValue * rawDiscount) / 100 + shipping + adjustment + roundOff;

  const totalAssumingAmount =
    subTotalValue + (isInclusive ? 0 : taxValue) - rawDiscount + shipping + adjustment + roundOff;

  const looksLikeAmount =
    rawDiscount > 100 ||
    Math.abs(totalValue - totalAssumingAmount) + 0.01 < Math.abs(totalValue - totalAssumingPercent);

  if (!looksLikeAmount) {
    return { discountValue: rawDiscount, discountTypeValue: "percent" };
  }

  return {
    discountValue: (rawDiscount / subTotalValue) * 100,
    discountTypeValue: "percent"
  };
};

export const parsePercentage = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

export const applyRounding = (value: number, roundOffTo: string) => {
  const mode = String(roundOffTo || "").toLowerCase();
  if (!mode || mode === "none") return value;
  const factor = mode === "2dp" ? 100 : 1;
  return Math.round(value * factor) / factor;
};
