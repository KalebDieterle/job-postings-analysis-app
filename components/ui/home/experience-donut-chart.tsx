import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SharedExperienceChart } from "@/components/ui/charts/shared-experience-chart";

interface ExperienceData {
  level: string | null;
  count: number;
}

export function ExperienceDonutChart({ data }: { data: ExperienceData[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experience Level Distribution</CardTitle>
        <CardDescription>Job openings by experience requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <SharedExperienceChart data={data} height={380} showInnerRadius={true} />
        <div className="text-center mt-2 pt-4 border-t">
          <p className="text-3xl font-bold">{total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Positions</p>
        </div>
      </CardContent>
    </Card>
  );
}
