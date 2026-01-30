import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalJobs: number;
  totalCities: number;
  totalCountries: number;
}

export default function StatsCards({
  totalJobs,
  totalCities,
  totalCountries,
}: StatsCardsProps) {
  const stats = [
    { label: "Total Jobs", value: totalJobs },
    { label: "Cities", value: totalCities },
    { label: "Countries", value: totalCountries },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stat.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
