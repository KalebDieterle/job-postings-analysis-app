import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTopIndustries } from "@/db/queries";
import { IndustryRadarClient } from "./industry-radar-client";

export async function IndustryRadarChart() {
  const data = await getTopIndustries(6);

  const chartData = data.map((item) => ({
    industry: item.industry_name,
    count: Number(item.count),
  }));

  return (
    <Card className="w-fit mx-auto">
      <CardHeader className="items-center pb-4">
        <CardTitle>Industry Distribution</CardTitle>
        <CardDescription>Top sectors by active job volume</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <IndustryRadarClient chartData={chartData} />
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 leading-none font-medium">
          Hiring Leader: {data[0]?.industry_name}{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground flex items-center gap-2 leading-none text-xs">
          Analyzing {data.length} sectors across 24,473 companies
        </div>
      </CardFooter>
    </Card>
  );
}
