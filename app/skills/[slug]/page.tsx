export const dynamic = "force-dynamic";

import { getSkillDetails, getSkillTrendingData } from "@/db/queries";
import { SkillTimelineChart } from "@/components/ui/charts/skill-timeline-chart";
import { StatCard } from "@/components/ui/stat-card";
import { Briefcase, DollarSign, BarChart3, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface TopEmployer {
  name: string | null;
  count: number;
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const decodedName = decodeURIComponent(resolvedParams.slug);

  const [details, trendingData] = await Promise.all([
    getSkillDetails(decodedName),
    getSkillTrendingData(decodedName),
  ]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Back Button */}
      <Link href="/skills">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="h-4 w-4" /> Back to All Skills
        </Button>
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl capitalize">
          {decodedName}
        </h1>
        <p className="text-muted-foreground text-lg">
          Detailed market analysis for {decodedName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Postings"
          value={details.count.toLocaleString()}
          icon={Briefcase}
          description="Across all companies"
        />
        <StatCard
          title="Median Salary"
          value={`$${Math.round((details.medianSalary ?? details.avgSalary) / 1000)}k`}
          icon={DollarSign}
          description="Per year"
        />
        <StatCard
          title="Market Share"
          value={`${details.marketShare}%`}
          icon={BarChart3}
          description="Of total job market"
        />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Volume Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-87.5">
            <SkillTimelineChart data={trendingData} />
          </div>
        </CardContent>
      </Card>

      {/* Top Employers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Hiring Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {details.topEmployers.length > 0 ? (
              details.topEmployers.map((company: TopEmployer, index) => (
                <div
                  key={company.name ?? `company-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">
                      {company.name || "Unknown Company"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {company.count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.count === 1 ? "posting" : "postings"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No company data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
