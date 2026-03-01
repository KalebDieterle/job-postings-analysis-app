// Data updates throughout the day; ISR keeps pages fresh without forcing per-request SSR.
export const revalidate = 1800;

import { getJobsByCityFiltered, getJobsByCountry } from "@/db/queries";
import StatsCards from "@/components/ui/locations/stats-card";
import GlobalHeatMapCard from "@/components/ui/locations/global-heatmap-card";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { LocationsFilterBar } from "@/components/ui/filters/locations-filter-bar";
import { locationsSearchParamsCache } from "@/lib/locations-search-params";
import { generateLocationSlug } from "@/lib/location-utils";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { QuickInsights } from "@/components/ui/locations/quick-insights";
import { TopCitiesChart } from "@/components/ui/locations/top-cities-chart";
import { MarketScatterPlot } from "@/components/ui/locations/market-scatter-plot";
import { RegionalDistribution } from "@/components/ui/locations/regional-distribution";
import { LocationsTabs } from "@/components/ui/locations/locations-tabs";
import { CityOpportunityPanel } from "@/components/ui/locations/city-opportunity-panel";
import { MobilePageHeader } from "@/components/ui/mobile/mobile-page-header";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";
import { MobileStickyActions } from "@/components/ui/mobile/mobile-sticky-actions";

export const metadata = {
  title: "Job Locations - Global Distribution",
  description: "Explore job postings across cities and countries worldwide",
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type LocationRow = {
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  jobCount?: number;
  companyCount?: number;
  medianSalary?: number;
  avgSalary?: number;
  remoteRatio?: number;
};

function withSlug(location: LocationRow) {
  const city = location.city ?? "Unknown";
  const state = location.state ?? "";
  const country = location.country ?? "";

  return {
    location: location.location ?? city,
    city,
    state,
    country,
    lat: location.lat ?? null,
    lng: location.lng ?? null,
    jobCount: Number(location.jobCount || 0),
    companyCount: Number(location.companyCount || 0),
    medianSalary: Number(location.medianSalary || 0),
    avgSalary: Number(location.avgSalary || 0),
    remoteRatio: Number(location.remoteRatio || 0),
    slug: generateLocationSlug(city, state, country),
  };
}

export default async function LocationsPage({ searchParams }: PageProps) {
  const filters = await locationsSearchParamsCache.parse(searchParams);

  const parsedPage =
    typeof filters.page === "string"
      ? Number.parseInt(filters.page, 10)
      : filters.page;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const sort: "jobs" | "salary" | "name" =
    filters.sort === "salary" || filters.sort === "name"
      ? filters.sort
      : "jobs";

  const baseQuery = {
    q: filters.q,
    state: filters.state,
    country: filters.country,
    minSalary: filters.minSalary,
    minJobs: filters.minJobs,
    sort,
  };

  const [pagedLocations, dashboardLocations, countryData] = await Promise.all([
    getJobsByCityFiltered({ ...baseQuery, page, limit }),
    getJobsByCityFiltered({ ...baseQuery, page: 1, limit: 5000 }),
    getJobsByCountry(),
  ]);

  const cityData = pagedLocations.items.map(withSlug);
  const dashboardLocationData = dashboardLocations.items.map(withSlug);
  const chartReadyData = dashboardLocationData;

  const totalJobs = dashboardLocations.totalJobs;
  const totalLocations = pagedLocations.total;
  const hasNextPage = page * limit < pagedLocations.total;
  const hasPrevPage = page > 1;

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (filters.q) params.set("q", filters.q);
    if (filters.state) params.set("state", filters.state);
    if (filters.country) params.set("country", filters.country);
    if (filters.minSalary > 0)
      params.set("minSalary", filters.minSalary.toString());
    if (filters.minJobs > 0) params.set("minJobs", filters.minJobs.toString());
    if (sort !== "jobs") params.set("sort", sort);
    return `/locations?${params.toString()}`;
  };

  const locationsWithSalary = dashboardLocationData.filter(
    (loc) => (loc.avgSalary || 0) > 0,
  );

  const highestPayingLocation =
    locationsWithSalary.length > 0
      ? locationsWithSalary.reduce((max, loc) =>
          (loc.avgSalary || 0) > (max.avgSalary || 0) ? loc : max,
        )
      : null;

  const jobHotspot =
    dashboardLocationData.length > 0
      ? dashboardLocationData.reduce((max, loc) =>
          (loc.jobCount || 0) > (max.jobCount || 0) ? loc : max,
        )
      : null;

  const marketAverageSalary =
    locationsWithSalary.length > 0
      ? locationsWithSalary.reduce((sum, loc) => sum + (loc.avgSalary || 0), 0) /
        locationsWithSalary.length
      : 0;

  const comparisonPercentage =
    highestPayingLocation && marketAverageSalary
      ? ((marketAverageSalary - (highestPayingLocation.avgSalary || 0)) /
          Math.max(1, highestPayingLocation.avgSalary || 1)) *
        100
      : 0;

  const stateDistribution = new Map<string, number>();
  dashboardLocationData.forEach((location) => {
    const state = location.state || "Other";
    const current = stateDistribution.get(state) || 0;
    stateDistribution.set(state, current + (location.jobCount || 0));
  });

  const sortedStates = Array.from(stateDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const otherStatesTotal = Array.from(stateDistribution.entries())
    .slice(5)
    .reduce((sum, [, count]) => sum + count, 0);

  const regionalTotal = Math.max(totalJobs, 1);
  const regionalData = [
    ...sortedStates.map(([name, value]) => ({
      name,
      value,
      percentage: (value / regionalTotal) * 100,
    })),
    ...(otherStatesTotal > 0
      ? [
          {
            name: "Others",
            value: otherStatesTotal,
            percentage: (otherStatesTotal / regionalTotal) * 100,
          },
        ]
      : []),
  ];

  return (
    <MobilePageShell>
      <MobilePageHeader
        title="Location Explorer"
        subtitle="Discover job opportunities and salary insights across cities worldwide"
      />

      {highestPayingLocation && jobHotspot && (
        <QuickInsights
          highestPayingLocation={{
            name: [highestPayingLocation.city, highestPayingLocation.state]
              .filter(Boolean)
              .join(", "),
            salary: highestPayingLocation.avgSalary || 0,
          }}
          jobHotspot={{
            name: [jobHotspot.city, jobHotspot.state].filter(Boolean).join(", "),
            jobCount: jobHotspot.jobCount || 0,
            trend: "up",
          }}
          marketAverage={{
            avgSalary: marketAverageSalary,
            comparison: comparisonPercentage,
          }}
        />
      )}

      <MobileStickyActions>
        <LocationsFilterBar />
      </MobileStickyActions>

      <LocationsTabs
        dashboardContent={
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 h-full flex flex-col gap-6">
                <StatsCards
                  totalJobs={totalJobs}
                  totalCities={dashboardLocations.total}
                  totalCountries={countryData.length}
                />
                <CityOpportunityPanel data={dashboardLocationData} />
              </div>
              <div className="lg:col-span-4">
                <RegionalDistribution data={regionalData} />
              </div>
            </div>

            <TopCitiesChart data={chartReadyData} />

            <MarketScatterPlot data={chartReadyData} />
          </>
        }
        browseContent={
          <>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {filters.q || filters.state || filters.country
                    ? `Search Results${filters.q ? ` for "${filters.q}"` : ""}${filters.state ? ` in ${filters.state}` : ""}${filters.country ? ` (${filters.country})` : ""}`
                    : "Top Locations"}
                </h2>
              </div>

              {cityData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityData.map((location, index) => {
                    const locationName = [
                      location.city,
                      location.state,
                      location.country,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <Link
                        key={`${location.slug}-${offset + index}`}
                        href={`/locations/${location.slug}`}
                        className="group"
                      >
                        <Card className="hover:shadow-lg transition-shadow h-full">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                      <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                      {locationName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      #{offset + index + 1}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Jobs
                                    </p>
                                    <p className="font-semibold">
                                      {Number(location.jobCount || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {(location.avgSalary || 0) > 0 && (
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Median Salary
                                      </p>
                                      <p className="font-semibold">
                                        ${(Number(location.avgSalary) / 1000).toFixed(0)}k
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No locations found
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Try adjusting your search or filters to find what you&apos;re
                      looking for.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {(hasNextPage || hasPrevPage) && cityData.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-slate-200 py-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {offset + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {offset + cityData.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {totalLocations}
                  </span>{" "}
                  locations
                </p>
                <PaginationControls
                  currentPage={page}
                  hasNextPage={hasNextPage}
                  hasPrevPage={hasPrevPage}
                  buildPageUrl={buildPageUrl}
                />
              </div>
            )}
          </>
        }
        mapContent={<GlobalHeatMapCard cityData={dashboardLocationData} />}
      />
    </MobilePageShell>
  );
}
