import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Stat {
  label: string;
  value: string | number;
  iconName: "TrendingUp" | "Users" | "DollarSign" | "Target" | "Sparkles"; // Use string instead of component
  trend?: string;
  trendUp?: boolean;
}

interface StatsOverviewProps {
  stats: Stat[];
  className?: string;
}

// Map icon names to components
const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Sparkles: require("lucide-react").Sparkles, // Add Sparkles
};

export function StatsOverview({ stats, className }: StatsOverviewProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => {
        const Icon = iconMap[stat.iconName];
        return (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    {stat.trend && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          stat.trendUp
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
