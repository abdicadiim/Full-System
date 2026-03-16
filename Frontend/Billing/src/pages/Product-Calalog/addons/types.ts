export type AddonStatus = "Active" | "Inactive";

export interface AddonRecord {
  id: string;
  product: string;
  addonName: string;
  addonCode: string;
  description: string;
  status: AddonStatus;
  pricingModel: string;
  addonType: string;
  unit?: string;
  billingFrequency?: string;
  startingQuantity?: string | number;
  endingQuantity?: string | number;
  price: number;
  imageUrl?: string;
  account: string;
  associatedPlans?: "All Plans" | "Selected Plans" | string;
  selectedPlans?: string[];
  plan?: string;
  includeInWidget?: boolean;
  showInPortal?: boolean;
  taxName: string;
  createdAt: string;
  updatedAt: string;
}
