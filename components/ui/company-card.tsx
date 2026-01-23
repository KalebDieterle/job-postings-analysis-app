import React from "react";
import { Building2 } from "lucide-react";

interface CompanyCardProps {
  name: string;
  count: number;
  rank: number;
  country: string;
  size: string;
}

export function CompanyCard({
  name,
  count,
  rank,
  country,
  size,
}: CompanyCardProps) {
  return (
    <div className="p-5 rounded-xl border bg-card hover:bg-muted/50 transition-all hover:shadow-md flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        {/* Rank Badge */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
          #{rank}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{country}</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-start mb-4">
        <span className="font-semibold text-base sm:text-lg leading-tight mb-1 line-clamp-2">
          {name}
        </span>
        <span className="text-xs text-muted-foreground">
          {size ? `Employees: ${size}` : null}
        </span>
      </div>
      <div className="flex items-end justify-between mt-auto">
        <div>
          <span className="text-lg font-bold text-primary">
            {count.toLocaleString()}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">
            {count === 1 ? "Position" : "Positions"}
          </span>
        </div>
      </div>
    </div>
  );
}
