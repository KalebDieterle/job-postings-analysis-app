import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />

      {/* FilterBar Skeleton */}
      <div className="h-16 bg-card border rounded-lg animate-pulse" />

      {/* CompanyOverview Skeleton */}
      <div className="h-32 bg-card border rounded-lg animate-pulse" />

      {/* IndustryRadarChart Skeleton */}
      <div className="h-64 bg-card border rounded-lg animate-pulse" />

      {/* Info text skeleton */}
      <div className="h-5 w-48 bg-muted animate-pulse rounded-md" />

      {/* Company Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-40 bg-card border rounded-xl animate-pulse"
          />
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-16 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
      </div>
    </div>
  );
}
