import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

interface SalaryInsight {
  highestRole: string;
  highestSalary: number;
  lowestRole: string;
  lowestSalary: number;
  medianSalary: number;
  minSalary: number;
  maxSalary: number;
}

export function SalaryInsightsPanel({ data }: { data: SalaryInsight }) {
  const salaryRange = data.maxSalary - data.minSalary;
  const medianPercentage = ((data.medianSalary - data.minSalary) / salaryRange) * 100;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-lg transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Salary Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/roles`}
            className="group p-4 rounded-lg bg-white dark:bg-gray-900 border hover:border-green-600 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Highest Paying</p>
                <p className="font-semibold text-sm truncate group-hover:text-green-600 transition-colors">
                  {data.highestRole}
                </p>
                <p className="text-lg font-bold text-green-600">
                  ${(data.highestSalary / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/roles`}
            className="group p-4 rounded-lg bg-white dark:bg-gray-900 border hover:border-red-600 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Lowest Paying</p>
                <p className="font-semibold text-sm truncate group-hover:text-red-600 transition-colors">
                  {data.lowestRole}
                </p>
                <p className="text-lg font-bold text-red-600">
                  ${(data.lowestSalary / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/roles`}
            className="group p-4 rounded-lg bg-white dark:bg-gray-900 border hover:border-blue-600 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Median Salary</p>
                <p className="font-semibold text-sm">Across All Roles</p>
                <p className="text-lg font-bold text-blue-600">
                  ${(data.medianSalary / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${(data.minSalary / 1000).toFixed(0)}k</span>
            <span>Salary Range</span>
            <span>${(data.maxSalary / 1000).toFixed(0)}k</span>
          </div>
          <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: "100%" }}
            />
            <div
              className="absolute h-full w-1 bg-white shadow-lg"
              style={{ left: `${medianPercentage}%` }}
              title={`Median: $${(data.medianSalary / 1000).toFixed(0)}k`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
