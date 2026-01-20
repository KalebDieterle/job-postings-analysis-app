import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HomeLoading() {
  return (
    <div className="container mx-auto space-y-8">
      {/* Header Skeleton (Matches your Header component height) */}
      <Skeleton className="h-16 w-full mb-8" />

      {/* Highlight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 mt-30">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-50">
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trending Chart Wrapper Skeleton */}
      <div className="flex justify-center mt-10 px-4">
        <Card className="w-full max-w-5xl">
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-100 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
