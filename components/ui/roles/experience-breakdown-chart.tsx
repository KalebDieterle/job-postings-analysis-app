import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SharedExperienceChart } from "@/components/ui/charts/shared-experience-chart";

interface ExperienceData {
  level: string | null;
  count: number;
}

interface ExperienceBreakdownChartProps {
  data: ExperienceData[];
}

export function ExperienceBreakdownChart({ data }: ExperienceBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Experience Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No experience data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experience Level Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Breakdown by experience requirements
        </p>
      </CardHeader>
      <CardContent>
        <SharedExperienceChart data={data} height={350} showInnerRadius={false} />
      </CardContent>
    </Card>
  );
}
