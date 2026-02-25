"use client";

import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import IconAvatar from "@/lib/icon-avatar";

interface TimePoint {
  day: string;
  count: number;
}

interface RoleCardProps {
  title: string;
  href?: string;
  count: number;
  timeseries?: TimePoint[];
  medianSalary?: number;
  className?: string;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function Sparkline({
  data,
  width = 140,
  height = 36,
  stroke = "#06b6d4",
  fill = "rgba(6,182,212,0.08)",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        <text
          x="50%"
          y="50%"
          fill="#9ca3af"
          fontSize="10"
          textAnchor="middle"
          dy="4"
        >
          no data
        </text>
      </svg>
    );
  }

  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + innerW * (i / (data.length - 1 || 1));
    const y = padding + innerH * (1 - (v - min) / range);
    return [x, y];
  });

  const linePath = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${padding + innerW} ${padding + innerH} L ${padding} ${padding + innerH} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="trend"
    >
      <path d={areaPath} fill={fill} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={0.8} fill={stroke} />
      ))}
    </svg>
  );
}

const RoleCard: React.FC<RoleCardProps> = ({
  title,
  href,
  count,
  timeseries = [],
  medianSalary,
  className,
}) => {
  const ordered = [...timeseries].sort(
    (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime(),
  );
  const series = ordered.map((p) => p.count);

  const content = (
    <Card
      className={cn(
        "group hover:shadow-lg hover:scale-105 transition-transform duration-150",
        className,
      )}
    >
      <CardHeader className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <IconAvatar title={title} />
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Role
            </CardDescription>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{formatNumber(count)}</div>
          <div className="text-xs text-muted-foreground">postings</div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground mb-1">
              Recent trend
            </div>
            <Sparkline data={series} />
          </div>
          <div className="w-20 text-right text-xs text-muted-foreground">
            {series.length > 0 ? (
              <>
                <div className="text-sm font-semibold">
                  {series[series.length - 1]}
                </div>
                <div className="text-[10px]">latest</div>
              </>
            ) : (
              <div className="text-[10px]">no recent data</div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground">View details</div>
          {medianSalary && medianSalary > 0 ? (
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ${Math.round(medianSalary / 1000)}k median
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">•</div>
          )}
        </div>
      </CardFooter>
    </Card>
  );

  return href ? (
    <Link href={href} className="block" aria-label={`View ${title}`}>
      {content}
    </Link>
  ) : (
    content
  );
};

export default RoleCard;
