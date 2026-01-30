import { getJobsByCity, getJobsByCountry } from "@/db/queries";
import LocationsHeader from "@/components/ui/locations/locations-header";
import StatsCards from "@/components/ui/locations/stats-card";
import GlobalHeatMapCard from "@/components/ui/locations/global-heatmap-card";
import TopLocationsCard from "@/components/ui/locations/top-locations-card";

export const metadata = {
  title: "Job Locations - Global Distribution",
  description: "Explore job postings across cities and countries worldwide",
};

export default async function LocationsPage() {
  const [cityData, countryData] = await Promise.all([
    getJobsByCity(),
    getJobsByCountry(),
  ]);

  const totalJobs = cityData.reduce(
    (sum: number, loc) => sum + (loc.jobCount || 0),
    0,
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <LocationsHeader />

      <StatsCards
        totalJobs={totalJobs}
        totalCities={cityData.length}
        totalCountries={countryData.length}
      />

      <GlobalHeatMapCard cityData={cityData} />

      <TopLocationsCard locations={cityData.slice(0, 50)} />
    </div>
  );
}
