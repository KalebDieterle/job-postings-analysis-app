"use client";

interface HeatLegendProps {
  min?: number;
  max?: number;
  label?: string;
}

export default function HeatLegend({
  min = 0,
  max = 100,
  label = "Job Density",
}: HeatLegendProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 z-1000 pointer-events-auto">
      <h3 className="text-sm font-semibold mb-3 text-foreground">{label}</h3>
      <div className="flex flex-col gap-2">
        <div
          className="w-8 h-32 rounded"
          style={{
            background: `linear-gradient(to top, 
              #0000ff 0%,
              #00ffff 20%,
              #00ff00 40%,
              #ffff00 60%,
              #ff8800 80%,
              #ff0000 100%
            )`,
          }}
        />
        <div className="flex flex-col text-xs text-muted-foreground">
          <span className="text-right font-semibold">
            {max.toLocaleString()}
          </span>
          <span className="text-right mt-auto">{min}</span>
        </div>
      </div>
    </div>
  );
}
