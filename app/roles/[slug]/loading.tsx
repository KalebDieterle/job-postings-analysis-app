import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-6 pt-8 max-w-7xl space-y-10">
      {/* 1. Navigation Skeleton */}
      <div className="pb-6">
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* 2. Insight Header Skeleton */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-12 w-3/4 md:w-1/2" />
        <Skeleton className="h-6 w-full md:w-2/3" />
      </div>

      {/* 3. Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-slate-100">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Main Content Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Skeleton */}
        <div className="lg:col-span-2">
          <Card className="border-slate-100">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-87.5 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Company List Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
