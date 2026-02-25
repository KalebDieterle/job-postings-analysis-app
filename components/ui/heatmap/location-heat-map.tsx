"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import map components
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
) as any;

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
) as any;

const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false },
) as any;

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
}) as any;

// Import custom components
const HeatLayer = dynamic(() => import("./heat-layer"), { ssr: false }) as any;
import HeatLegend from "./heat-legend";
import MapControls from "./map-controls";

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
  const [viewMode, setViewMode] = useState<"heat" | "markers" | "both">(
    "markers",
  );
  const [radius, setRadius] = useState(20); // Reduced from 25
  const [blur, setBlur] = useState(12); // Reduced from 15

  useEffect(() => {
    // Import Leaflet CSS dynamically
    if (typeof window !== "undefined") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);

      // Wait for CSS to load before mounting
      link.onload = () => {
        setIsMounted(true);
      };

      // Fallback in case onload doesn't fire
      setTimeout(() => setIsMounted(true), 500);
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="h-150 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Filter out locations without coordinates
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

  // Prepare heat map points: [lat, lng, intensity]
  const heatPoints: [number, number, number][] = validLocations.map((loc) => [
    loc.lat!,
    loc.lng!,
    loc.jobCount / maxJobs, // Normalize intensity 0-1
  ]);

  return (
    <div className="h-150 rounded-lg overflow-hidden border relative">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Heat Layer */}
        {(viewMode === "heat" || viewMode === "both") && (
          <HeatLayer
            points={heatPoints}
            radius={radius}
            blur={blur}
            max={1.0}
          />
        )}

        {/* Circle Markers */}
        {(viewMode === "markers" || viewMode === "both") &&
          validLocations.map((location, idx) => {
            // Scale radius based on job count
            const markerRadius =
              Math.sqrt(location.jobCount / maxJobs) * 40 + 5;

            // Color based on job count intensity
            const intensity = location.jobCount / maxJobs;
            const color = `hsl(${200 - intensity * 100}, 70%, 50%)`;

            return (
              <CircleMarker
                key={idx}
                center={[location.lat!, location.lng!]}
                radius={markerRadius}
                pathOptions={{
                  fillColor: color,
                  color: "#1e40af",
                  weight: 1,
                  opacity: 0.8,
                  fillOpacity: viewMode === "both" ? 0.3 : 0.6,
                }}
              >
                <Popup>
                  <div className="min-w-50">
                    <h3 className="font-bold text-base mb-2">
                      {location.city}
                      {location.state &&
                        location.state !== "0" &&
                        `, ${location.state}`}
                      {location.country && ` (${location.country})`}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-semibold">Jobs:</span>{" "}
                        {location.jobCount.toLocaleString()}
                      </p>
                      {location.avgSalary && (
                        <p>
                          <span className="font-semibold">Median Salary:</span> $
                          {Math.round(location.avgSalary).toLocaleString()}
                        </p>
                      )}
                      {location.remoteRatio !== null && (
                        <p>
                          <span className="font-semibold">Remote:</span>{" "}
                          {Math.round(location.remoteRatio * 100)}%
                        </p>
                      )}
                    </div>
                    <a
                      href={`/locations/${location.city?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      View details &rarr;
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Controls */}
      <MapControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        radius={radius}
        onRadiusChange={setRadius}
        blur={blur}
        onBlurChange={setBlur}
      />

      {/* Legend (only show in heat mode) */}
      {(viewMode === "heat" || viewMode === "both") && (
        <HeatLegend min={minJobs} max={maxJobs} label="Job Postings" />
      )}
    </div>
  );
}
