export const SUPPORTED_TIMEFRAMES = [7, 30, 90] as const;

export type SupportedTimeframe = (typeof SUPPORTED_TIMEFRAMES)[number];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function normalizeTimeframeDays(timeframe: number): SupportedTimeframe {
  return SUPPORTED_TIMEFRAMES.includes(timeframe as SupportedTimeframe)
    ? (timeframe as SupportedTimeframe)
    : 30;
}

export function buildAnchoredTimeframeWindow(anchorDate: Date, timeframe: number) {
  const days = normalizeTimeframeDays(timeframe);
  const endDate = new Date(anchorDate);
  const startDate = new Date(endDate.getTime() - days * DAY_IN_MS);
  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(startDate.getTime() - days * DAY_IN_MS);

  return {
    days,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
  };
}
