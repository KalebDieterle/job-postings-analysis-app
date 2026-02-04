"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
  data: number[];
  color?: "emerald" | "rose" | "amber" | "sky";
  height?: number;
  showTooltip?: boolean;
}

const colorMap = {
  emerald: {
    stroke: "hsl(var(--success))",
    fill: "url(#emerald-gradient)",
    gradientStart: "rgba(16, 185, 129, 0.3)",
    gradientEnd: "rgba(16, 185, 129, 0)",
  },
  rose: {
    stroke: "hsl(var(--destructive))",
    fill: "url(#rose-gradient)",
    gradientStart: "rgba(244, 63, 94, 0.3)",
    gradientEnd: "rgba(244, 63, 94, 0)",
  },
  amber: {
    stroke: "hsl(var(--warning))",
    fill: "url(#amber-gradient)",
    gradientStart: "rgba(245, 158, 11, 0.3)",
    gradientEnd: "rgba(245, 158, 11, 0)",
  },
  sky: {
    stroke: "hsl(var(--primary))",
    fill: "url(#sky-gradient)",
    gradientStart: "rgba(99, 102, 241, 0.3)",
    gradientEnd: "rgba(99, 102, 241, 0)",
  },
};

/**
 * Minimal sparkline chart for showing trends in cards
 */
export function Sparkline({
  data,
  color = "emerald",
  height = 40,
  showTooltip = false,
}: SparklineProps) {
  const colors = colorMap[color];
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient
              id={`${color}-gradient`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={colors.gradientStart} />
              <stop offset="100%" stopColor={colors.gradientEnd} />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  return (
                    <div className="glass px-2 py-1 rounded text-xs font-medium">
                      {payload[0].value}
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={1.5}
            fill={colors.fill}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TrendingChartProps {
  growthPercentage: number;
  /** Optional array of data points for sparkline. If not provided, generates synthetic data */
  dataPoints?: number[];
  height?: number;
}

/**
 * Full trending chart with auto-color based on growth direction
 */
export function TrendingChart({
  growthPercentage,
  dataPoints,
  height = 40,
}: TrendingChartProps) {
  // Generate synthetic trend data if not provided
  const data = dataPoints || generateTrendData(growthPercentage);

  // Determine color based on growth
  const color: SparklineProps["color"] =
    growthPercentage > 50
      ? "amber" // Breakout
      : growthPercentage > 0
        ? "emerald" // Rising
        : "rose"; // Falling

  return <Sparkline data={data} color={color} height={height} />;
}

/**
 * Generate synthetic trend data based on growth percentage
 * Creates a realistic-looking curve that ends with the growth trend
 */
function generateTrendData(growthPercentage: number, points = 7): number[] {
  const baseValue = 100;
  const endValue = baseValue + (baseValue * growthPercentage) / 100;
  const data: number[] = [];

  // Create somewhat organic growth curve
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    // Use easing function for natural curve
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Add some controlled variation
    const variation = Math.sin(i * 1.5) * 5;
    const value = baseValue + (endValue - baseValue) * eased + variation;
    data.push(Math.max(0, Math.round(value)));
  }

  // Ensure the last point reflects actual growth
  data[data.length - 1] = Math.round(endValue);

  return data;
}

export { generateTrendData };
