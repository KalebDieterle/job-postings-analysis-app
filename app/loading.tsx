import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function HomeLoading() {
  return (
    <>
      {/* Terminal header skeleton */}
      <header className="mb-6 md:mb-8 space-y-2">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-8 w-80 md:h-10" />
        <Skeleton className="h-3 w-96" />
        <div className="h-px mt-4" style={{ background: "var(--border)" }} />
      </header>

      <MobilePageShell className="py-2 md:py-4">
        {/* Metric cards */}
        <section className="space-y-2">
          <Skeleton className="h-3 w-72" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </section>

        <Skeleton className="h-56" />
        <Skeleton className="h-72" />

        {/* Companies + activity */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </section>
      </MobilePageShell>
    </>
  );
}
