import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function RoleDetailLoading() {
  return (
    <MobilePageShell className="max-w-7xl pt-2 md:pt-4">
      <Skeleton className="h-9 w-36 rounded-lg" />

      <div className="space-y-6 md:space-y-10">
        <section className="space-y-4 rounded-2xl border p-5 md:p-8">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
          <Skeleton className="h-9 w-72 md:h-12 md:w-96" />
          <Skeleton className="h-4 w-full max-w-3xl md:h-5" />
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Skeleton className="h-[22rem] rounded-xl lg:col-span-2" />
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </MobilePageShell>
  );
}
