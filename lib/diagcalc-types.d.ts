/** Shared contracts checked against JavaScript implementations by npm run typecheck. */
export interface DiagnosticInput {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  preTestProb: number;
}
export interface CalculationOptions {
  continuityCorrection?: "auto" | "always" | "never";
  locale?: string;
}
export interface Interval {
  lower: number;
  upper: number;
  corrected?: boolean;
}
export interface NumericMetric {
  value: number;
  ci?: Interval | null;
  unit?: string;
  interpretation?: { id: string; params: Record<string, number> };
}
export type NumericResults = Record<string, NumericMetric>;
export interface PresentedMetric extends NumericMetric {
  label: string;
  note: string;
  formatter?: (value: number) => string;
}
export type PresentedResults = Record<string, PresentedMetric>;
export interface CaseInfo {
  id?: string;
  savedAt?: string;
  label?: string;
  datasetKey?: string | null;
  modified?: boolean;
  legacy?: boolean;
  provenance?: unknown;
}
export interface EncodedNumber {
  value: number | null;
  status: "finite" | "infinite" | "negative-infinite" | "undefined";
}
export interface EncodedMetric extends EncodedNumber {
  ci: { lower: EncodedNumber; upper: EncodedNumber; corrected?: boolean } | null;
}
export interface Snapshot {
  schemaVersion: number;
  engineVersion: string;
  id: string;
  savedAt: string;
  label: string;
  datasetKey: string | null;
  modified: boolean;
  legacy: boolean;
  provenance?: unknown;
  input: DiagnosticInput;
  options: CalculationOptions;
  metrics: Record<string, EncodedMetric>;
}
