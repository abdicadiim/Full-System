export type CouponStatus = "Active" | "Inactive" | "Expired";
export type CouponDiscountType = "Percentage" | "Flat";
export type CouponRedemptionType = "One Time" | "Unlimited" | "Limited Cycles";

export interface CouponRecord {
  id: string;
  product: string;
  couponName: string;
  couponCode: string;
  discountType: CouponDiscountType;
  discountValue: number;
  redemptionType: CouponRedemptionType;
  limitedCycles: number;
  maxRedemption: number;
  associatedPlans: string;
  associatedAddons: string;
  expirationDate: string;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

