"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import HeatLegend from "./heat-legend";
import MapControls from "./map-controls";

// Single dynamic import — all react-leaflet components load together in one chunk,
// preventing the staggered-load timing bug that caused fragmented tiles.
const LeafletMapInner = dynamic(() => import("./leaflet-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-muted flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading map...</p>
    </div>
  ),
});

interface LocationData {
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  jobCount: number;
  avgSalary: number | null;
  remoteRatio: number | null;
}

export default function LocationHeatMap({ data }: { data: LocationData[] }) {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"heat" | "markers" | "both">("markers");
  const [radius, setRadius] = useState(20);
  const [blur, setBlur] = useState(12);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-150 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const validLocations = data.filter(
    (loc) => loc.lat !== null && loc.lng !== null && loc.city !== null,
  );

  if (validLocations.length === 0) {
    return (
      <div className="h-150 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No location data available</p>
      </div>
    );
  }

  const maxJobs = Math.max(...validLocations.map((d) => d.jobCount));
  const minJobs = Math.min(...validLocations.map((d) => d.jobCount));

  const heatPoints: [number, number, number][] = validLocations.map((loc) => [
    loc.lat!,
    loc.lng!,
    loc.jobCount / maxJobs,
  ]);

  return (
    <div className="h-150 rounded-lg overflow-hidden border relative">
      <LeafletMapInner
        validLocations={validLocations}
        heatPoints={heatPoints}
        maxJobs={maxJobs}
        minJobs={minJobs}
        viewMode={viewMode}
        radius={radius}
        blur={blur}
      />

      <MapControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        radius={radius}
        onRadiusChange={setRadius}
        blur={blur}
        onBlurChange={setBlur}
      />

      {(viewMode === "heat" || viewMode === "both") && (
        <HeatLegend min={minJobs} max={maxJobs} label="Job Postings" />
      )}
    </div>
  );
}
