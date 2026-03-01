import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function CompanyDetailLoading() {
  return (
    <MobilePageShell className="pb-8">
      <Skeleton className="h-52 rounded-xl md:h-64" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[28rem] rounded-xl lg:col-span-7" />
        <Skeleton className="h-[28rem] rounded-xl lg:col-span-5" />
      </div>

      <Skeleton className="h-[32rem] rounded-xl" />
    </MobilePageShell>
  );
}
