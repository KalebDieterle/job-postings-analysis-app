"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Jobs",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface IndustryRadarClientProps {
  chartData: { industry: string; count: number }[];
}

// Custom tick component for wrapping text
const CustomTick = ({ payload, x, y, textAnchor, stroke }: any) => {
  const text = payload.value;
  const maxLength = 20;

  // Split long text into multiple lines
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word: string) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  // Calculate offset based on position to avoid dot overlap
  const isTop = y < 200;
  const isBottom = y > 300;
  const yOffset = isTop ? -8 : isBottom ? 8 : 0;

  return (
    <g>
      {lines.map((line, index) => (
        <text
          key={index}
          x={x}
          y={y + yOffset + index * 12 - (lines.length - 1) * 6}
          textAnchor={textAnchor}
          fill="var(--muted-foreground)"
          fontSize={11}
          fontWeight={500}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function IndustryRadarClient({ chartData }: IndustryRadarClientProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square w-full max-w-[500px] h-[400px]"
    >
      <RadarChart
        data={chartData}
        margin={{ top: 50, right: 100, bottom: 50, left: 100 }}
      >
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value, payload) => {
                const fullName = payload?.[0]?.payload?.industry;
                return fullName || value;
              }}
            />
          }
        />
        <PolarAngleAxis dataKey="industry" tick={CustomTick} />
        <PolarGrid />
        <Radar
          dataKey="count"
          fill="var(--chart-1)"
          fillOpacity={0.6}
          dot={{
            r: 5,
            fillOpacity: 1,
          }}
        />
      </RadarChart>
    </ChartContainer>
  );
}
