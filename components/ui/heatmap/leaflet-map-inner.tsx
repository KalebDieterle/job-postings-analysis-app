"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import dynamic from "next/dynamic";

const HeatLayer = dynamic(() => import("./heat-layer"), { ssr: false }) as any;

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

interface LeafletMapInnerProps {
  validLocations: LocationData[];
  heatPoints: [number, number, number][];
  maxJobs: number;
  minJobs: number;
  viewMode: "heat" | "markers" | "both";
  radius: number;
  blur: number;
}

// Fixes fragmented tiles by forcing Leaflet to recalculate container size after mount.
// Required because the container dimensions may not be fully resolved when Leaflet initializes.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function LeafletMapInner({
  validLocations,
  heatPoints,
  maxJobs,
  minJobs,
  viewMode,
  radius,
  blur,
}: LeafletMapInnerProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      className="z-0"
    >
      <MapResizer />

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
          const markerRadius = Math.sqrt(location.jobCount / maxJobs) * 40 + 5;
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
  );
}
