import React from "react";
import { Building2 } from "lucide-react";

interface CompanyCardProps {
  name: string;
  count: number;
  rank: number;
  country?: string;
}

export function CompanyCardPerRole({
  name,
  count,
  rank,
  country,
}: CompanyCardProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all hover:shadow-sm">
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
          {rank}
        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-sm sm:text-base leading-none mb-1">
            {name}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{country}</span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-bold text-primary">
          {count.toLocaleString()}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {count === 1 ? "Position" : "Positions"}
        </div>
      </div>
    </div>
  );
}
