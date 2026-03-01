import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function SkillDetailLoading() {
  return (
    <MobilePageShell>
      <Skeleton className="h-9 w-36 rounded-lg" />

      <div className="space-y-2">
        <Skeleton className="h-9 w-72 md:h-12 md:w-96" />
        <Skeleton className="h-4 w-64 md:h-5 md:w-80" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-80 rounded-xl" />

      <div className="space-y-3 rounded-xl border p-4 md:p-6">
        <Skeleton className="h-7 w-52" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    </MobilePageShell>
  );
}
