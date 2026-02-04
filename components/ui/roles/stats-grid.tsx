import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, MapPin, Wifi } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  gradient: string;
}

function StatCard({ title, value, icon, trend, gradient }: StatCardProps) {
  return (
    <Card className={`relative overflow-hidden ${gradient}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && (
              <p className="text-xs text-white/70 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="rounded-full bg-white/20 p-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  totalRoles: number;
  avgSalary: number;
  topLocation: { location: string; count: number };
  remotePercentage: number;
}

export function StatsGrid({
  totalRoles,
  avgSalary,
  topLocation,
  remotePercentage,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Roles"
        value={totalRoles.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5 text-white" />}
        gradient="bg-gradient-to-br from-blue-500 to-blue-700"
      />
      <StatCard
        title="Average Salary"
        value={
          avgSalary > 0
            ? `$${Math.round(avgSalary).toLocaleString()}`
            : "N/A"
        }
        icon={<DollarSign className="h-5 w-5 text-white" />}
        gradient="bg-gradient-to-br from-green-500 to-green-700"
      />
      <StatCard
        title="Top Location"
        value={
          topLocation.location !== "N/A"
            ? topLocation.location.split(",")[0]
            : "N/A"
        }
        icon={<MapPin className="h-5 w-5 text-white" />}
        trend={topLocation.count > 0 ? `${topLocation.count} postings` : undefined}
        gradient="bg-gradient-to-br from-purple-500 to-purple-700"
      />
      <StatCard
        title="Remote Work"
        value={`${remotePercentage}%`}
        icon={<Wifi className="h-5 w-5 text-white" />}
        trend="of all roles"
        gradient="bg-gradient-to-br from-orange-500 to-orange-700"
      />
    </div>
  );
}
