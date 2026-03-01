import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function SkillsLoading() {
  return (
    <MobilePageShell>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52 md:h-10 md:w-64" />
            <Skeleton className="h-4 w-72 md:w-[34rem]" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-16 rounded-xl" />

      <Skeleton className="h-32 rounded-xl" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-full" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-56 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t py-6 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-10 w-52 rounded-lg" />
      </div>

      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </MobilePageShell>
  );
}
