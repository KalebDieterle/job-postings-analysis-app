import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number; // Percentage change
  showLabel?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  showLabel = true,
  className,
}: TrendIndicatorProps) {
  const isUp = value > 5;
  const isDown = value < -5;
  const isNeutral = !isUp && !isDown;

  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : ArrowRight;

  const colorClass = isUp
    ? "text-green-500"
    : isDown
      ? "text-red-500"
      : "text-gray-500";

  const bgClass = isUp ? "bg-green-50" : isDown ? "bg-red-50" : "bg-gray-50";

  const label = isUp ? "Growing" : isDown ? "Declining" : "Stable";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className={cn("rounded-full p-1", bgClass)}>
        <Icon className={cn("w-4 h-4", colorClass)} />
      </div>
      {showLabel && (
        <span className={cn("text-sm font-medium", colorClass)}>
          {Math.abs(value)}%
        </span>
      )}
    </div>
  );
}
