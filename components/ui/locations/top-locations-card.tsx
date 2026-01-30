import LocationsList from "@/components/ui/heatmap/location-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopLocationsCardProps {
  locations: any[];
}

export default function TopLocationsCard({ locations }: TopLocationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Hiring Cities</CardTitle>
      </CardHeader>
      <CardContent>
        <LocationsList locations={locations} />
      </CardContent>
    </Card>
  );
}
