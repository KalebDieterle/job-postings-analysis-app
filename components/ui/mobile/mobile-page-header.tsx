import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type MobilePageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function MobilePageHeader({
  title,
  subtitle,
  actions,
  compact = false,
  className,
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:gap-4",
        !compact && "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tight md:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

