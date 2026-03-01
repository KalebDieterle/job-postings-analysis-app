import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MobilePageShellProps {
  children: ReactNode;
  className?: string;
}

export function MobilePageShell({ children, className }: MobilePageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl space-y-6 md:space-y-8", className)}>
      {children}
    </div>
  );
}

