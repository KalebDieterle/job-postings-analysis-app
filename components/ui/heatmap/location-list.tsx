import { slugifyLocation, formatSalary } from "@/lib/location-utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { MapPin, Building2, DollarSign } from "lucide-react";

interface LocationData {
  city: string | null;
  state: string | null;
  country: string | null;
  jobCount: number;
  companyCount: number;
  avgSalary: number | null;
}

export default function LocationsList({
  locations,
}: {
  locations: LocationData[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location, idx) => {
        const displayName = [location.city, location.state, location.country]
          .filter(Boolean)
          .join(", ");

        const slug = slugifyLocation(displayName);
        if (!slug) return null;

        return (
          <Link key={idx} href={`/locations/${slug}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-lg leading-tight">
                        {displayName}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {location.jobCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">jobs</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>
                      {location.companyCount.toLocaleString()} companies
                    </span>
                  </div>

                  {location.avgSalary !== null && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatSalary(location.avgSalary)} median</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
