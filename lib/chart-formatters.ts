export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}k`;
  }

  return `${Math.round(value)}`;
}

export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return `$${formatCompactNumber(value)}`;
}

export function truncateAxisLabel(label: string, maxLength: number = 14): string {
  if (!label) return "";
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatChartDate(value: string | number | Date): string {
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return String(value);
  return chartDateFormatter.format(dateValue);
}

