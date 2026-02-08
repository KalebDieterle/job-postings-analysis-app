"use client";

import { motion } from "framer-motion";

interface StatGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
}

export function StatGauge({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  showValue = true,
}: StatGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // Color based on value
  const getColor = (val: number) => {
    if (val >= 75) return "#10b981"; // green
    if (val >= 50) return "#f59e0b"; // amber
    if (val >= 25) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const color = getColor(value);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="text-2xl font-bold"
              style={{ color }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {Math.round(value)}
            </motion.span>
          </div>
        )}
      </div>
      {label && (
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {label}
        </p>
      )}
    </div>
  );
}
