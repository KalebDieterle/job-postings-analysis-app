import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MobileStickyActionsProps {
  children: ReactNode;
  className?: string;
}

export function MobileStickyActions({
  children,
  className,
}: MobileStickyActionsProps) {
  return (
    <div
      className={cn(
        "sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

