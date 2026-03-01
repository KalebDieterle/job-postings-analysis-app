import { Skeleton } from "@/components/ui/skeleton";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function HomeLoading() {
  return (
    <>
      <header className="border-b bg-background/95">
        <div className="mx-auto max-w-5xl space-y-4 px-2 py-8 text-center md:px-4 md:py-12">
          <div className="flex justify-center">
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="mx-auto h-9 w-72 md:h-12 md:w-[34rem]" />
            <Skeleton className="mx-auto h-4 w-full max-w-xl md:h-5" />
          </div>
          <Skeleton className="mx-auto h-px w-32 opacity-70" />
        </div>
      </header>

      <MobilePageShell className="py-2 md:py-4">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </section>

        <section>
          <Skeleton className="h-64 rounded-xl" />
        </section>

        <section>
          <Skeleton className="h-80 rounded-xl" />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[28rem] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[28rem] rounded-xl" />
        </section>
      </MobilePageShell>
    </>
  );
}
