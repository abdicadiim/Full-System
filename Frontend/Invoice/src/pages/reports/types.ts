export type ReportFunctionKey =
  | "filter"
  | "compare"
  | "group"
  | "performance"
  | "customizeColumns"
  | "sort"
  | "schedule"
  | "share"
  | "export"
  | "print"
  | "custom";

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
}

export interface ReportCalculatorField {
  key: string;
  label: string;
  defaultValue: number;
}

export interface ReportCalculator {
  resultLabel: string;
  fields: ReportCalculatorField[];
  calculate: (inputs: Record<string, number>) => number;
  precision?: number;
  helpText?: string;
}

export interface ReportDefinition {
  id: string;
  categoryId: string;
  name: string;
  summary: string;
  howItHelps: string;
  basis?: string;
  source?: string;
  formula?: string;
  logicNotes?: string[];
  functionSupport: Partial<Record<ReportFunctionKey, boolean>>;
  calculator?: ReportCalculator;
}

