export const VALID_ANNUAL_SALARY_MIN = 20_000;
export const VALID_ANNUAL_SALARY_MAX = 500_000;

type SalarySource = "adzuna" | "manual" | string;

export interface NormalizedAnnualSalary {
  minAnnual: number | null;
  maxAnnual: number | null;
  medAnnual: number | null;
  rejected: boolean;
  rejectionReason?: string;
}

function toAnnual(value: number, payPeriod?: string | null): number {
  const period = (payPeriod || "YEARLY").toUpperCase();
  if (period === "HOURLY") return value * 2080;
  if (period === "DAILY") return value * 260;
  if (period === "WEEKLY") return value * 52;
  if (period === "BIWEEKLY") return value * 26;
  if (period === "MONTHLY") return value * 12;
  return value;
}

function sanitize(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
}

export function normalizeAnnualSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  payPeriod: string | null | undefined,
  source: SalarySource
): NormalizedAnnualSalary {
  const cleanMin = sanitize(min);
  const cleanMax = sanitize(max);

  // Legacy recovery heuristic for known contaminated manual rows:
  // HOURLY values that are already very large are likely annual values.
  const isLegacyManualAnnualLikeHourly =
    source === "manual" &&
    (payPeriod || "").toUpperCase() === "HOURLY" &&
    ((cleanMin ?? 0) >= 1000 || (cleanMax ?? 0) >= 1000);

  const annualMin =
    cleanMin === null
      ? null
      : isLegacyManualAnnualLikeHourly
      ? cleanMin
      : toAnnual(cleanMin, payPeriod);

  const annualMax =
    cleanMax === null
      ? null
      : isLegacyManualAnnualLikeHourly
      ? cleanMax
      : toAnnual(cleanMax, payPeriod);

  const isOutOfRange = (value: number | null) =>
    value !== null &&
    (value < VALID_ANNUAL_SALARY_MIN || value > VALID_ANNUAL_SALARY_MAX);

  const hasRangeInversion =
    annualMin !== null && annualMax !== null && annualMax < annualMin;

  if (isOutOfRange(annualMin) || isOutOfRange(annualMax) || hasRangeInversion) {
    return {
      minAnnual: null,
      maxAnnual: null,
      medAnnual: null,
      rejected: true,
      rejectionReason: hasRangeInversion
        ? "range_inversion"
        : "outside_valid_annual_bounds",
    };
  }

  const medAnnual =
    annualMin !== null && annualMax !== null
      ? Math.round((annualMin + annualMax) / 2)
      : null;

  return {
    minAnnual: annualMin,
    maxAnnual: annualMax,
    medAnnual,
    rejected: false,
  };
}
