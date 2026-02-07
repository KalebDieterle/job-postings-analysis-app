"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  className?: string;
}

export function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  formatLabel,
  className,
}: RangeSliderProps) {
  const format = formatLabel || ((v) => v.toString());

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {format(value[0])}
        </span>
        <span className="text-slate-500 dark:text-slate-400">to</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {format(value[1])}
        </span>
      </div>
      <SliderPrimitive.Root
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className,
        )}
        value={value}
        onValueChange={(newValue) => onChange(newValue as [number, number])}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <SliderPrimitive.Range className="absolute h-full bg-blue-600 dark:bg-blue-500" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-blue-500 dark:bg-slate-950 dark:ring-offset-slate-950" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-blue-500 dark:bg-slate-950 dark:ring-offset-slate-950" />
      </SliderPrimitive.Root>
    </div>
  );
}
