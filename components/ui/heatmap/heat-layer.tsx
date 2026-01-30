"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface HeatLayerProps {
  points: [number, number, number][];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  gradient?: Record<number, string>;
}

export default function HeatLayer({
  points,
  radius = 20,
  blur = 12,
  maxZoom = 18,
  max = 1.0,
  gradient,
}: HeatLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || points.length === 0) return;

    let cancelled = false;

    const init = async () => {
      // 🔑 CRITICAL: expose Leaflet BEFORE loading plugin
      (window as any).L = L;

      // side-effect import ONLY
      await import("leaflet.heat");

      if (cancelled) return;

      if (typeof (L as any).heatLayer !== "function") {
        throw new Error("leaflet.heat loaded but L.heatLayer is missing");
      }

      // cleanup previous
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      // pane
      if (!map.getPane("heatmapPane")) {
        const pane = map.createPane("heatmapPane");
        pane.style.zIndex = "400";
      }

      heatLayerRef.current = (L as any)
        .heatLayer(points, {
          radius,
          blur,
          maxZoom,
          max,
          minOpacity: 0.3,
          pane: "heatmapPane",
          gradient: gradient ?? {
            0.0: "#0000ff",
            0.2: "#00ffff",
            0.4: "#00ff00",
            0.6: "#ffff00",
            0.8: "#ff8800",
            1.0: "#ff0000",
          },
        })
        .addTo(map);
    };

    init();

    return () => {
      cancelled = true;
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom, max, gradient]);

  return null;
}
