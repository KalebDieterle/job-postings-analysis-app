import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function LocationDetailLoading() {
  return (
    <MobilePageShell>
      <Skeleton className="h-64 rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-80 rounded-xl" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <Skeleton className="h-[30rem] rounded-xl" />
    </MobilePageShell>
  );
}
