import Link from "next/link";
import { slugify } from "@/lib/slugify";
import { TrendingUp, DollarSign, BarChart3, ArrowUpDown } from "lucide-react";

interface MarketInsightsBarProps {
  highestPayingRole: string;
  highestSalary: number;
  mostInDemandRole: string;
  mostInDemandCount: number;
  medianSalary: number;
  minSalary: number;
  maxSalary: number;
}

interface InsightItemProps {
  icon: React.ReactNode;
  label: string;
  headline: string;
  subtext: string;
  href?: string;
  accentClass: string;
}

function InsightItem({ icon, label, headline, subtext, href, accentClass }: InsightItemProps) {
  const inner = (
    <div className="bg-background rounded-lg border p-4 h-full transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${accentClass} rounded-md p-1.5`}>{icon}</div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold ${accentClass.replace("bg-", "text-").replace("/10", "")} leading-tight`}>
        {headline}
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtext}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function MarketInsightsBar({
  highestPayingRole,
  highestSalary,
  mostInDemandRole,
  mostInDemandCount,
  medianSalary,
  minSalary,
  maxSalary,
}: MarketInsightsBarProps) {
  const highestSlug = slugify(highestPayingRole);
  const demandSlug = slugify(mostInDemandRole);

  const rangeLabel =
    minSalary > 0 && maxSalary > 0
      ? `$${Math.round(minSalary / 1000)}k – $${Math.round(maxSalary / 1000)}k`
      : "N/A";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Market Pulse
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InsightItem
          icon={<DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
          label="Highest Paying"
          headline={highestSalary > 0 ? `$${Math.round(highestSalary / 1000)}k avg` : "N/A"}
          subtext={highestPayingRole || "—"}
          href={highestSlug ? `/roles/${highestSlug}` : undefined}
          accentClass="bg-emerald-500/10"
        />
        <InsightItem
          icon={<BarChart3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
          label="Most In-Demand"
          headline={mostInDemandCount > 0 ? `${mostInDemandCount.toLocaleString()} jobs` : "N/A"}
          subtext={mostInDemandRole || "—"}
          href={demandSlug ? `/roles/${demandSlug}` : undefined}
          accentClass="bg-indigo-500/10"
        />
        <InsightItem
          icon={<TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
          label="Median Market Pay"
          headline={medianSalary > 0 ? `$${Math.round(medianSalary / 1000)}k/yr` : "N/A"}
          subtext="Across all roles with salary data"
          accentClass="bg-blue-500/10"
        />
        <InsightItem
          icon={<ArrowUpDown className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />}
          label="Salary Range"
          headline={rangeLabel}
          subtext="Floor to ceiling across the market"
          accentClass="bg-orange-500/10"
        />
      </div>
    </div>
  );
}
