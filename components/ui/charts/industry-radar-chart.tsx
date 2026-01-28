import { TrendingUp } from "lucide-react";
import { getTopIndustries } from "@/db/queries";
import { IndustryRadarClient } from "./industry-radar-client";

export async function IndustryRadarChart() {
  const data = await getTopIndustries(6);

  const chartData = data.map((item) => ({
    industry: item.industry_name,
    count: Number(item.count),
  }));

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center">
        <IndustryRadarClient chartData={chartData} />
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium">
          Hiring Leader: {data[0]?.industry_name}{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-xs">
          Analyzing {data.length} sectors across 24,473 companies
        </div>
      </div>
    </div>
  );
}
