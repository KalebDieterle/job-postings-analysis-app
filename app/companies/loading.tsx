import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function CompaniesLoading() {
  return (
    <MobilePageShell className="pb-4 md:pb-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 md:h-10 md:w-64" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <Skeleton className="h-7 w-40" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t py-6 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-10 w-52 rounded-lg" />
      </div>
    </MobilePageShell>
  );
}
