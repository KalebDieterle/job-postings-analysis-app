import { Suspense } from "react";
import LocationHeatMap from "@/components/ui/heatmap/location-heat-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlobalHeatMapCardProps {
  cityData: any[];
}

export default function GlobalHeatMapCard({
  cityData,
}: GlobalHeatMapCardProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Global Job Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={<div className="h-150 bg-muted animate-pulse rounded-lg" />}
        >
          <LocationHeatMap data={cityData} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
