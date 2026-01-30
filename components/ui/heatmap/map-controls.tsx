"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

interface MapControlsProps {
  viewMode: "heat" | "markers" | "both";
  onViewModeChange: (mode: "heat" | "markers" | "both") => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  blur: number;
  onBlurChange: (blur: number) => void;
}

export default function MapControls({
  viewMode,
  onViewModeChange,
  radius,
  onRadiusChange,
  blur,
  onBlurChange,
}: MapControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-1000 pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg hover:bg-accent transition-colors"
        title="Map Settings"
      >
        <Settings className="w-5 h-5 text-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 min-w-62.5">
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            Map Settings
          </h3>

          {/* View Mode */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">
              Display Mode
            </label>
            <div className="flex gap-2">
              {(["heat", "markers", "both"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Heat Settings (only show when heat is active) */}
          {(viewMode === "heat" || viewMode === "both") && (
            <>
              {/* Radius */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">
                  Heat Radius: {radius}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={radius}
                  onChange={(e) => onRadiusChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Blur */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">
                  Blur Amount: {blur}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={blur}
                  onChange={(e) => onBlurChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Showing{" "}
            {viewMode === "heat"
              ? "density heat map"
              : viewMode === "markers"
                ? "individual markers"
                : "both layers"}
          </div>
        </div>
      )}
    </div>
  );
}
