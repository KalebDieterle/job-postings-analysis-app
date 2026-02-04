import { getJobsByCity, getJobsByCountry } from "@/db/queries";
import LocationsHeader from "@/components/ui/locations/locations-header";
import StatsCards from "@/components/ui/locations/stats-card";
import GlobalHeatMapCard from "@/components/ui/locations/global-heatmap-card";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import { searchParamsCache } from "@/lib/search-params";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building2, TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Job Locations - Global Distribution",
  description: "Explore job postings across cities and countries worldwide",
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Map full state names to abbreviations
const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  "district of columbia": "dc",
  "puerto rico": "pr",
};

// Reverse map: abbreviation to full name
const STATE_FULL_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([full, abbr]) => [abbr, full]),
);

// Generate location slug matching database format
function generateLocationSlug(
  city?: string | null,
  state?: string | null,
  country?: string | null,
): string {
  const parts: string[] = [];

  if (city) {
    parts.push(
      city
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  }

  if (state) {
    const stateLower = state.toLowerCase().trim();
    const stateSlug = stateLower
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const abbreviated =
      STATE_ABBREVIATIONS[stateLower] ||
      STATE_ABBREVIATIONS[stateSlug] ||
      stateSlug;

    parts.push(abbreviated);
  }

  return parts.join("-");
}

// Normalize state name to abbreviation for consistent comparison
function normalizeState(state?: string | null): string {
  if (!state) return "";

  const stateLower = state.toLowerCase().trim();
  const stateSlug = stateLower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Return abbreviation if we can find it, otherwise return lowercase version
  return (
    STATE_ABBREVIATIONS[stateLower] ||
    STATE_ABBREVIATIONS[stateSlug] ||
    stateLower
  );
}

// Normalize city name for comparison
function normalizeCityName(city?: string | null): string {
  if (!city) return "";

  return city
    .toLowerCase()
    .trim()
    .replace(/\s+city$/i, "") // Remove "City" suffix
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/[^a-z0-9\s]/g, ""); // Remove special chars but keep spaces
}

// Get the best display name (prefer shorter, cleaner names)
function getBestDisplayName(name1: string, name2: string): string {
  // Remove "City" suffix for comparison
  const clean1 = name1.replace(/\s+City$/i, "");
  const clean2 = name2.replace(/\s+City$/i, "");

  // If one has "City" and the other doesn't, prefer the one without
  if (
    name1.toLowerCase().endsWith(" city") &&
    !name2.toLowerCase().endsWith(" city")
  ) {
    return name2;
  }
  if (
    name2.toLowerCase().endsWith(" city") &&
    !name1.toLowerCase().endsWith(" city")
  ) {
    return name1;
  }

  // Otherwise prefer the shorter name
  return name1.length <= name2.length ? name1 : name2;
}

// Deduplicate locations by normalized city + state
function deduplicateLocations(locations: any[]): any[] {
  const locationMap = new Map<string, any>();

  console.log(`🔍 Deduplicating ${locations.length} locations...`);

  for (const location of locations) {
    // Create a unique key based on normalized city + normalized state
    const normalizedCity = normalizeCityName(location.city);
    const normalizedState = normalizeState(location.state);
    const key = `${normalizedCity}|${normalizedState}`;

    if (locationMap.has(key)) {
      // Merge with existing location
      const existing = locationMap.get(key)!;

      // Sum job counts
      const existingJobs = Number(existing.jobCount) || 0;
      const newJobs = Number(location.jobCount) || 0;
      existing.jobCount = existingJobs + newJobs;

      // Weighted average for salary based on job counts
      const existingSalary = Number(existing.avgSalary) || 0;
      const newSalary = Number(location.avgSalary) || 0;

      if (existingSalary > 0 && newSalary > 0) {
        existing.avgSalary = Math.round(
          (existingSalary * existingJobs + newSalary * newJobs) /
            (existingJobs + newJobs),
        );
      } else if (newSalary > 0) {
        existing.avgSalary = newSalary;
      }

      // Use best display name
      existing.city = getBestDisplayName(existing.city, location.city);

      // Keep the most complete state name (prefer full name over abbreviation for display)
      if (
        location.state &&
        location.state.length > 2 &&
        (!existing.state || existing.state.length <= 2)
      ) {
        existing.state = location.state;
      }

      console.log(
        `  Merged: "${location.city}, ${location.state}" into "${existing.city}, ${existing.state}" (${existing.jobCount} total jobs)`,
      );
    } else {
      // First time seeing this location
      locationMap.set(key, {
        ...location,
        jobCount: Number(location.jobCount) || 0,
        avgSalary: Number(location.avgSalary) || 0,
      });
    }
  }

  const deduplicated = Array.from(locationMap.values()).sort(
    (a, b) => (b.jobCount || 0) - (a.jobCount || 0),
  );

  console.log(`✅ Deduplicated to ${deduplicated.length} unique locations`);

  return deduplicated;
}

export default async function LocationsPage({ searchParams }: PageProps) {
  const filters = await searchParamsCache.parse(searchParams);
  const page =
    typeof filters.page === "string"
      ? parseInt(filters.page)
      : filters.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const [cityDataRaw, countryData] = await Promise.all([
    getJobsByCity(),
    getJobsByCountry(),
  ]);

  // Deduplicate locations FIRST
  const deduplicatedData = deduplicateLocations(cityDataRaw);

  // Then apply search filters
  let filteredCityData = deduplicatedData;

  if (filters.q) {
    const searchLower = filters.q.toLowerCase();
    filteredCityData = deduplicatedData.filter((location: any) => {
      const cityMatch = location.city?.toLowerCase().includes(searchLower);
      const stateMatch = location.state?.toLowerCase().includes(searchLower);
      const countryMatch = location.country
        ?.toLowerCase()
        .includes(searchLower);
      return cityMatch || stateMatch || countryMatch;
    });
  }

  if (filters.location) {
    const locationLower = filters.location.toLowerCase();
    filteredCityData = filteredCityData.filter((location: any) => {
      const cityMatch = location.city?.toLowerCase().includes(locationLower);
      const stateMatch = location.state?.toLowerCase().includes(locationLower);
      const countryMatch = location.country
        ?.toLowerCase()
        .includes(locationLower);
      return cityMatch || stateMatch || countryMatch;
    });
  }

  const totalJobs = filteredCityData.reduce(
    (sum: number, loc) => sum + (loc.jobCount || 0),
    0,
  );

  const hasNextPage = filteredCityData.length > offset + limit;
  const hasPrevPage = page > 1;

  const cityData = filteredCityData
    .slice(offset, offset + limit)
    .map((location: any) => ({
      ...location,
      slug: generateLocationSlug(
        location.city,
        location.state,
        location.country,
      ),
    }));

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (filters.q) params.set("q", filters.q);
    if (filters.location) params.set("location", filters.location);
    return `/locations?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
            Location Explorer
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Discover job opportunities and salary insights across cities
            worldwide
          </p>
        </div>
      </div>

      <FilterBar />

      <StatsCards
        totalJobs={totalJobs}
        totalCities={filteredCityData.length}
        totalCountries={countryData.length}
      />

      <GlobalHeatMapCard cityData={deduplicatedData} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {filters.q || filters.location
              ? `Search Results${filters.q ? ` for "${filters.q}"` : ""}`
              : "Top Locations"}
          </h2>
        </div>

        {cityData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityData.map((location: any, index: number) => {
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
                                {Number(
                                  location.jobCount || 0,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {location.avgSalary && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Avg Salary
                                </p>
                                <p className="font-semibold">
                                  $
                                  {(Number(location.avgSalary) / 1000).toFixed(
                                    0,
                                  )}
                                  k
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
              <h3 className="text-lg font-semibold mb-2">No locations found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Try adjusting your search or filters to find what you're looking
                for.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {(hasNextPage || hasPrevPage) && cityData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-slate-200 dark:border-slate-800 gap-4">
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
              {filteredCityData.length}
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
    </div>
  );
}
