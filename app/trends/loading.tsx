import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function TrendsLoading() {
  return (
    <MobilePageShell>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 md:h-10 md:w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <Skeleton className="h-24 rounded-xl" />

      <Skeleton className="h-4 w-44" />

      <div className="bento-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-16 rounded-xl" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>

      <Skeleton className="h-28 rounded-xl" />
    </MobilePageShell>
  );
}
