import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function SalaryPredictorLoading() {
  return (
    <MobilePageShell>
      <div className="space-y-2">
        <div className="mb-2 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-52 md:w-64" />
        </div>
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border p-4 md:p-6">
          <Skeleton className="h-7 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        <div className="space-y-4 rounded-xl border p-4 md:p-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </MobilePageShell>
  );
}
