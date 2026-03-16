export type PricingWidgetStatus = "Active" | "Inactive";

export interface PricingWidgetRecord {
  id: string;
  name: string;
  product: string;
  createdBy?: string;
  template: string;
  status: PricingWidgetStatus;
  selectedPlans: string;
  caption: string;
  buttonLabel: string;
  buttonColor: string;
  createdAt: string;
  updatedAt: string;
}
