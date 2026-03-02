import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MAX_DISPLAY_GROWTH_PERCENT = 999;

export function formatGrowthPercentage(
  growth: number,
  options?: {
    decimals?: number;
    showSign?: boolean;
    cap?: number;
  },
) {
  const decimals = options?.decimals ?? 1;
  const showSign = options?.showSign ?? true;
  const cap = options?.cap ?? MAX_DISPLAY_GROWTH_PERCENT;

  const safeGrowth = Number.isFinite(growth) ? growth : 0;
  const absValue = Math.min(Math.abs(safeGrowth), cap);
  const sign =
    safeGrowth > 0 ? "+" : safeGrowth < 0 ? "-" : showSign ? "+" : "";

  return `${sign}${absValue.toFixed(decimals)}%`;
}
