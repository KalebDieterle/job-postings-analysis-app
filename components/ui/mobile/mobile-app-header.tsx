"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getRouteMetadata } from "@/lib/mobile-route-meta";
import { usePathname } from "next/navigation";

export function MobileAppHeader() {
  const pathname = usePathname();
  const metadata = getRouteMetadata(pathname);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-3 px-3 md:px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <SidebarTrigger className="size-9 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight md:text-base">
            {metadata.title}
          </h1>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}

